import type { LiveEventMessage } from "@sanity/client"
import { env } from "app/env"
import libraryConfig from "app/libraryConfig"
import { getDeploymentVersionMetadata } from "library/deploymentVersion"
import { sleep } from "library/functions"
import { siteURL } from "library/siteURL"
import { revalidatePath, revalidateTag } from "next/cache"
import { defineQuery } from "next-sanity"
import { client } from "sanity/lib/client"
import { token } from "sanity/lib/token"
import * as z from "zod"
import {
	getLiveProxySupport,
	getLiveProxyUnsupportedMessage,
	isLocalSiteURL,
} from "./liveEnvironment"
import { stringifyLiveProxyEvent } from "./liveProxyEvents"

export const dynamic = "force-dynamic"

/**
 * SANITY_AUTH_TOKEN is also passed as next-sanity's `browserToken` (see
 * live.tsx), so it has to stay read-only. Writing the watermark needs
 * create/update, so allow a separate server-only token for it. Without one the
 * write fails, the watermark never persists, and startup catchup falls back to
 * its time-based window.
 */
const stateClient = client.withConfig({
	token: process.env.SANITY_WRITE_TOKEN || token,
	useCdn: false,
	stega: false,
})
const connectedClients = new Set<WritableStreamDefaultWriter<Uint8Array>>()
const encoder = new TextEncoder()
const internalSecret = env.SANITY_AUTH_TOKEN

const STARTUP_SAFETY_WINDOW_MS = 60_000
const LIVE_STATE_ID = "_reform.liveState"
const LIVE_STATE_TYPE = "reformLiveState"
const WATERMARK_WRITE_MAX_ATTEMPTS = 5
const MAX_LIVE_STATE_ENTRIES = 50
const HEARTBEAT_INTERVAL_MS = 25_000
const MAX_CONNECTION_MS = 280_000
const RECONNECT_LEAD_TIME_MS = 5_000

let messageQueue = Promise.resolve()
let sanitySubscription: LiveSubscription | null = null

/**
 * per-instance fallback for when the watermark can't be persisted to Sanity.
 * Keeps a subscription restart on a warm instance from redoing startup catchup.
 */
let inMemoryWatermark: string | null = null

/** the watermark write failing is worth saying once per instance, not per event */
let hasWarnedAboutWatermarkWrite = false

type LiveSubscription = { unsubscribe: () => void }
type LiveStateEntry = {
	_key: string
	key: string
	processedAt: string
	processedThroughUpdatedAt: string
	reason: string
}
type LiveState = {
	_rev?: string
	states?: LiveStateEntry[]
}

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
		states[] {
			_key,
			key,
			processedAt,
			processedThroughUpdatedAt,
			reason
		}
	}
`)

function getLiveStateKey() {
	if (isLocalSiteURL(siteURL)) return null

	const { deploymentId } = getDeploymentVersionMetadata()
	return deploymentId
}

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
		`data: ${stringifyLiveProxyEvent({ type: "refresh" })}\n\n`,
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
	return await stateClient.fetch<LiveState | null>(liveStateQuery, {
		id: LIVE_STATE_ID,
	})
}

function getLiveStateEntry(state: LiveState | null, key: string) {
	return state?.states?.find((entry) => entry.key === key)
}

async function writeProcessedWatermark({
	processedThroughUpdatedAt,
	reason,
	stateKey,
}: {
	processedThroughUpdatedAt: string
	reason: string
	stateKey: string
}) {
	const nextStateEntry = {
		_key: stateKey,
		key: stateKey,
		processedThroughUpdatedAt,
		processedAt: new Date().toISOString(),
		reason,
	}

	for (let attempt = 0; attempt < WATERMARK_WRITE_MAX_ATTEMPTS; attempt++) {
		const state = await getLiveState()
		const stateEntry = getLiveStateEntry(state, stateKey)

		if (
			stateEntry?.processedThroughUpdatedAt &&
			!isNewerTimestamp(
				processedThroughUpdatedAt,
				stateEntry.processedThroughUpdatedAt ?? undefined,
			)
		) {
			return
		}

		const states = [
			nextStateEntry,
			...(state?.states ?? []).filter((entry) => entry.key !== stateKey),
		].slice(0, MAX_LIVE_STATE_ENTRIES)

		try {
			if (state?._rev) {
				await stateClient
					.patch(LIVE_STATE_ID)
					.ifRevisionId(state._rev)
					.set({ states })
					.commit()
				return
			}

			await stateClient.createIfNotExists({
				_id: LIVE_STATE_ID,
				_type: LIVE_STATE_TYPE,
				states,
			})
			return
		} catch (error) {
			if (isRevisionConflict(error)) {
				if (attempt < WATERMARK_WRITE_MAX_ATTEMPTS - 1) {
					await sleep(25 * (attempt + 1))
					continue
				}

				const latestState = await getLiveState()
				const latestStateEntry = getLiveStateEntry(latestState, stateKey)
				if (
					latestStateEntry?.processedThroughUpdatedAt &&
					!isNewerTimestamp(
						processedThroughUpdatedAt,
						latestStateEntry.processedThroughUpdatedAt ?? undefined,
					)
				) {
					return
				}
			}
			throw error
		}
	}
}

async function updateProcessedWatermark(reason: string) {
	const stateKey = getLiveStateKey()
	if (!stateKey) return

	const latestPublishedUpdatedAt = await getLatestPublishedUpdatedAt()
	if (!latestPublishedUpdatedAt) return

	// record locally even if the Sanity write fails, so this instance doesn't
	// redo startup catchup if its subscription restarts
	if (
		isNewerTimestamp(latestPublishedUpdatedAt, inMemoryWatermark ?? undefined)
	) {
		inMemoryWatermark = latestPublishedUpdatedAt
	}

	await writeProcessedWatermark({
		processedThroughUpdatedAt: latestPublishedUpdatedAt,
		reason,
		stateKey,
	}).catch((error) => {
		if (hasWarnedAboutWatermarkWrite) return
		hasWarnedAboutWatermarkWrite = true
		console.error(
			"Unable to write Sanity live state watermark — startup catchup will fall back to its time-based window. Set SANITY_WRITE_TOKEN to a token with create/update access to persist it.",
			error,
		)
	})
}

async function runStartupCatchup(workerStartedAt: Date) {
	const stateKey = getLiveStateKey()
	if (!stateKey) {
		await revalidate({ broad: true })
		return
	}

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
		const stateEntry = getLiveStateEntry(state, stateKey)
		const latestPublishedMs = Date.parse(latestPublishedUpdatedAt)
		const isNearStartup =
			latestPublishedMs >= workerStartedAt.getTime() - STARTUP_SAFETY_WINDOW_MS
		// Only a watermark we actually have is evidence of staleness. Treating
		// "no watermark" as "everything is stale" means a full-site flush on
		// every new subscription whenever the watermark can't be persisted,
		// which stampedes every route's regeneration at once. isNearStartup
		// remains the bounded catch for a publish landing around a cold start.
		const watermark =
			stateEntry?.processedThroughUpdatedAt ?? inMemoryWatermark ?? undefined
		const isNewerThanWatermark = watermark
			? isNewerTimestamp(latestPublishedUpdatedAt, watermark)
			: false

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
	let isClosed = false
	let heartbeatInterval: ReturnType<typeof setInterval> | undefined
	let reconnectTimeout: ReturnType<typeof setTimeout> | undefined
	let timeout: ReturnType<typeof setTimeout> | undefined

	connectedClients.add(writer)
	writer
		.write(
			encoder.encode(
				`data: ${stringifyLiveProxyEvent({
					deployment: getDeploymentVersionMetadata(),
					type: "connected",
				})}\n\n`,
			),
		)
		.catch(() => {})
	startUpstreamSubscription()

	const cleanup = () => {
		if (isClosed) return
		isClosed = true
		if (heartbeatInterval) clearInterval(heartbeatInterval)
		if (reconnectTimeout) clearTimeout(reconnectTimeout)
		if (timeout) clearTimeout(timeout)
		connectedClients.delete(writer)
		writer.close().catch(() => {})
	}

	heartbeatInterval = setInterval(() => {
		writer.write(encoder.encode(": ping\n\n")).catch(cleanup)
	}, HEARTBEAT_INTERVAL_MS)
	reconnectTimeout = setTimeout(() => {
		writer
			.write(
				encoder.encode(
					`event: reconnect\ndata: ${JSON.stringify({ reason: "max-duration" })}\n\n`,
				),
			)
			.catch(cleanup)
	}, MAX_CONNECTION_MS - RECONNECT_LEAD_TIME_MS)
	timeout = setTimeout(cleanup, MAX_CONNECTION_MS)

	request.signal.addEventListener("abort", () => {
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
