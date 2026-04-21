"use client"

import { useEffect } from "react"

/**
 * a lightweight version of SanityLive
 *
 * - shares connections to sanity between clients
 * - works event without CORS configuration (although you should still configure it for the studio)
 */
export function SanityLiveProxy() {
	useEffect(() => {
		const eventSource = new EventSource("/api/live")
		return () => eventSource.close()
	}, [])

	return null
}
