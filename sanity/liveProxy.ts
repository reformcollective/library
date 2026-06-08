import type { LiveEventMessage } from "@sanity/client"
import { env } from "app/env"
import libraryConfig from "app/libraryConfig"
import { siteURL } from "library/siteURL"
import { revalidatePath, revalidateTag } from "next/cache"
import { defineQuery } from "next-sanity"
import { client } from "sanity/lib/client"
import { token } from "sanity/lib/token"
import * as z from "zod"
import {
	getLiveProxySupport,
	getLiveProxyUnsupportedMessage,
} from "./liveEnvironment"

export const dynamic = "force-dynamic"

const stateClient = client.withConfig({ token, useCdn: false, stega: false })
const connectedClients = new Set<WritableStreamDefaultWriter<Uint8Array>>()
const encoder = new TextEncoder()
const internalSecret = env.SANITY_AUTH_TOKEN

const STARTUP_SAFETY_WINDOW_MS = 60_000
const LIVE_STATE_ID = "_reform.liveState"
const LIVE_STATE_TYPE = "reformLiveState"

let messageQueue = Promise.resolve()
let sanitySubscription: LiveSubscription | null = null

type LiveSubscription = { unsubscribe: () => void }

const postPayloadSchema = z.union([
	z
		.object({
			broad: z.literal(true),
			tags: z.never().optional(),
		})
		.transform(() => ({ type: "broad" as const })),
	z
		.object({
			broad: z.never().optional(),
			tags: z.array(z.string().startsWith("s1:")).nonempty(),
		})
		.transform(({ tags }) => ({ tags, type: "tags" as const })),
])
type ParsedPostPayload = z.infer<typeof postPayloadSchema> | { type: "invalid" }

const latestPublishedUpdatedAtQuery = defineQuery(`
	*[
		!(_id in path("drafts.**")) &&
		!(_id in path("versions.**")) &&
		!(_id in path("_reform.**"))
	] | order(_updatedAt desc)[0]._updatedAt
`)

const liveStateQuery = defineQuery(`
	*[_id == $id][0] {
		_rev,
		processedThroughUpdatedAt
	}
`)

async function revalidate(payload: { broad: true } | { tags: string[] }) {
	const response = await fetch(`${siteURL}/api/live`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${internalSecret}`,
		},
		body: JSON.stringify(payload),
	})

	if (!response.ok) {
		console.error("Sanity live revalidation failed", {
			status: response.status,
			body: await response.text(),
		})
		return false
	}

	return true
}

function broadcastRefresh() {
	const payload = encoder.encode(
		`data: ${JSON.stringify({ type: "refresh" })}\n\n`,
	)
	for (const writer of connectedClients) {
		writer.write(payload).catch(() => {})
	}
}

function isNewerTimestamp(candidate: string, current?: string) {
	if (!current) return true
	return Date.parse(candidate) > Date.parse(current)
}

function isRevisionConflict(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"statusCode" in error &&
		error.statusCode === 409
	)
}

function parsePostPayload(body: unknown): ParsedPostPayload {
	const result = postPayloadSchema.safeParse(body)
	if (!result.success) return { type: "invalid" }
	return result.data
}

async function getLatestPublishedUpdatedAt() {
	return await stateClient.fetch(latestPublishedUpdatedAtQuery)
}

async function getLiveState() {
	return await stateClient.fetch(liveStateQuery, {
		id: LIVE_STATE_ID,
	})
}

async function writeProcessedWatermark({
	processedThroughUpdatedAt,
	reason,
}: {
	processedThroughUpdatedAt: string
	reason: string
}) {
	const nextState = {
		processedThroughUpdatedAt,
		processedAt: new Date().toISOString(),
		reason,
	}

	for (let attempt = 0; attempt < 2; attempt++) {
		const state = await getLiveState()

		if (
			state?.processedThroughUpdatedAt &&
			!isNewerTimestamp(
				processedThroughUpdatedAt,
				state.processedThroughUpdatedAt ?? undefined,
			)
		) {
			return
		}

		try {
			if (state?._rev) {
				await stateClient
					.patch(LIVE_STATE_ID)
					.ifRevisionId(state._rev)
					.set(nextState)
					.commit()
				return
			}

			await stateClient.createIfNotExists({
				_id: LIVE_STATE_ID,
				_type: LIVE_STATE_TYPE,
				...nextState,
			})
			return
		} catch (error) {
			if (attempt === 0 && isRevisionConflict(error)) continue
			throw error
		}
	}
}

async function updateProcessedWatermark(reason: string) {
	const latestPublishedUpdatedAt = await getLatestPublishedUpdatedAt()
	if (!latestPublishedUpdatedAt) return

	await writeProcessedWatermark({
		processedThroughUpdatedAt: latestPublishedUpdatedAt,
		reason,
	}).catch((error) => {
		console.error("Unable to write Sanity live state watermark", error)
	})
}

async function runStartupCatchup(workerStartedAt: Date) {
	const [latestPublishedResult, stateResult] = await Promise.allSettled([
		getLatestPublishedUpdatedAt(),
		getLiveState(),
	])
	const latestPublishedUpdatedAt =
		latestPublishedResult.status === "fulfilled"
			? latestPublishedResult.value
			: null
	const state = stateResult.status === "fulfilled" ? stateResult.value : null
	let shouldBroadRevalidate =
		latestPublishedResult.status === "rejected" ||
		stateResult.status === "rejected"

	if (latestPublishedResult.status === "rejected") {
		console.error(
			"Unable to read latest published Sanity update",
			latestPublishedResult.reason,
		)
	}
	if (stateResult.status === "rejected") {
		console.error("Unable to read Sanity live state", stateResult.reason)
	}

	if (latestPublishedUpdatedAt) {
		const latestPublishedMs = Date.parse(latestPublishedUpdatedAt)
		const isNearStartup =
			latestPublishedMs >= workerStartedAt.getTime() - STARTUP_SAFETY_WINDOW_MS
		const isNewerThanWatermark = isNewerTimestamp(
			latestPublishedUpdatedAt,
			state?.processedThroughUpdatedAt ?? undefined,
		)

		shouldBroadRevalidate =
			shouldBroadRevalidate || isNearStartup || isNewerThanWatermark
	}

	if (!shouldBroadRevalidate) return

	await revalidate({ broad: true })
}

function queueLiveMessage(event: LiveEventMessage) {
	messageQueue = messageQueue
		.then(async () => {
			await revalidate({ tags: event.tags })
		})
		.catch((error) => {
			console.error("Unable to process Sanity live message", error)
		})
}

function startUpstreamSubscription() {
	if (sanitySubscription) {
		return
	}

	const workerStartedAt = new Date()
	let hasRunStartupCatchup = false

	sanitySubscription = client.live.events().subscribe({
		next: (event) => {
			if (event.type === "welcome" && !hasRunStartupCatchup) {
				hasRunStartupCatchup = true
				void runStartupCatchup(workerStartedAt)
			}

			if (event.type === "message") {
				queueLiveMessage(event)
			}
		},
		error: (err) => {
			console.error("Sanity upstream error:", err)
			sanitySubscription = null
		},
	})
}

const MAX_CONNECTION_MS = 280_000

export async function POST(request: Request) {
	const bearer = request.headers.get("Authorization")?.replace("Bearer ", "")
	if (bearer !== internalSecret) {
		return Response.json({ error: "unauthorized" }, { status: 401 })
	}

	const payload = parsePostPayload(await request.json().catch(() => null))

	if (payload.type === "invalid") {
		return Response.json(
			{ error: "expected either {tags: string[]} or {broad: true}" },
			{ status: 400 },
		)
	}

	if (payload.type === "tags") {
		for (const tag of payload.tags) {
			revalidateTag(`sanity:${tag}`, { expire: 0 })
		}
		await updateProcessedWatermark("tags")
	} else {
		revalidatePath("/", "layout")
		await updateProcessedWatermark("broad")
	}

	broadcastRefresh()

	return Response.json({ revalidated: true })
}

export async function GET(request: Request) {
	const { allowProxy, canUseLiveProxy } = getLiveProxySupport({
		allowProxy: libraryConfig.allowProxy,
		currentSiteURL: siteURL,
	})
	if (!allowProxy) {
		return Response.json(
			{ error: "Sanity live proxy is disabled." },
			{ status: 404 },
		)
	}
	if (!canUseLiveProxy) {
		const message = getLiveProxyUnsupportedMessage()
		console.warn(message)
		return Response.json({ error: message }, { status: 500 })
	}

	const responseStream = new TransformStream()
	const writer = responseStream.writable.getWriter()

	connectedClients.add(writer)
	writer
		.write(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`))
		.catch(() => {})
	startUpstreamSubscription()

	const cleanup = () => {
		connectedClients.delete(writer)
		writer.close().catch(() => {})
	}

	const timeout = setTimeout(cleanup, MAX_CONNECTION_MS)

	request.signal.addEventListener("abort", () => {
		clearTimeout(timeout)
		cleanup()
	})

	return new Response(responseStream.readable, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		},
	})
}
