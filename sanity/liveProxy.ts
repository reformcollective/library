// app/api/live/route.ts

import { revalidateSyncTags } from "next-sanity/live/server-actions"
import { client } from "sanity/lib/client"

export const dynamic = "force-dynamic"

// ------------------------------------------------------------------
// MODULE SCOPE (Singleton State)
// ------------------------------------------------------------------
const connectedClients = new Set<WritableStreamDefaultWriter<Uint8Array>>()
let sanitySubscription: { unsubscribe: () => void } | null = null
let cachedWelcomeEvent: string | null = null
const encoder = new TextEncoder()

function broadcast(data: string) {
	// cache welcome events to replay to new clients
	try {
		const parsed = JSON.parse(data) as { type?: string }
		if (parsed.type === "welcome") {
			cachedWelcomeEvent = data
		}
	} catch {}

	const payload = encoder.encode(`data: ${data}\n\n`)
	for (const writer of connectedClients) {
		writer.write(payload).catch(() => {
			// Client likely disconnected; cleanup happens in request handler
		})
	}
}

function startUpstreamSubscription() {
	if (sanitySubscription) {
		console.log("🔗 Adding new client to live proxy")
		return
	}

	console.log("⚡️ Opening shared upstream connection to Sanity...")

	// We rely on the default behavior: includeAllDocuments=false
	// This means we only receive events for PUBLISHED content, which is exactly
	// what we want for public cache invalidation.
	sanitySubscription = client.live.events().subscribe({
		next: (event) => {
			if (event.type === "message") {
				revalidateSyncTags(event.tags)
			}
			broadcast(JSON.stringify(event))
		},
		error: (err) => {
			console.error("Sanity upstream error:", err)
			// Optional: Logic to restart subscription if it actually dies
			sanitySubscription = null
		},
	})
}

// ------------------------------------------------------------------
// ROUTE HANDLER
// ------------------------------------------------------------------

// close connections before vercel's hard timeout (300s on pro, 60s on hobby)
// this lets the client's native EventSource auto-reconnect handle it gracefully
const MAX_CONNECTION_MS = 280_000

export async function GET(request: Request) {
	const responseStream = new TransformStream()
	const writer = responseStream.writable.getWriter()

	connectedClients.add(writer)
	startUpstreamSubscription()

	// replay cached welcome event to new clients
	if (cachedWelcomeEvent) {
		const payload = encoder.encode(`data: ${cachedWelcomeEvent}\n\n`)
		writer.write(payload).catch(() => {})
	}

	const cleanup = () => {
		connectedClients.delete(writer)
		writer.close().catch(() => {})
	}

	// proactive graceful shutdown before vercel kills us
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
