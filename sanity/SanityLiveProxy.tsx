"use client"

import type { LiveEvent } from "@sanity/client"
import { useRouter } from "next/navigation"
import { revalidateSyncTags } from "next-sanity/live/server-actions"
import { useEffect } from "react"

/**
 * a lightweight version of SanityLive
 * 
 * - shares connections to sanity between clients
 * - works event without CORS configuration (although you should still configure it for the studio)
 */
export function SanityLiveProxy() {
	const router = useRouter()

	useEffect(() => {
		const eventSource = new EventSource("/api/live")

		eventSource.onmessage = (e) => {
			const event = JSON.parse(e.data) as LiveEvent
			if (event.type === "message") {
				revalidateSyncTags(event.tags)
			} else if (event.type === "restart" || event.type === "reconnect") {
				router.refresh()
			}
		}

		return () => eventSource.close()
	}, [router])

	return null
}
