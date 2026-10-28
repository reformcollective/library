import type { VideoProvider } from "library/videos/types"

const ORIGINS: Partial<Record<VideoProvider, string[]>> = {
	youtube: [
		"https://www.youtube.com",
		"https://i.ytimg.com",
		"https://www.google.com",
	],
	vimeo: [
		"https://player.vimeo.com",
		"https://i.vimeocdn.com",
		"https://f.vimeocdn.com",
	],
	wistia: [
		"https://fast.wistia.com",
		"https://fast.wistia.net",
		"https://embed-ssl.wistia.com",
	],
	twitch: ["https://player.twitch.tv", "https://static.twitchcdn.net"],
	tiktok: ["https://www.tiktok.com"],
	spotify: ["https://open.spotify.com"],
	cloudflare: ["https://iframe.cloudflarestream.com"],
}

const NOCOOKIE = ["https://www.youtube-nocookie.com", "https://i.ytimg.com"]
const done = new Set<string>()

/** Adds preconnect hints for the provider's player origins. Safe to call repeatedly; each origin is added once. */
export function preconnectProvider(provider: VideoProvider, privacy = false) {
	if (typeof document === "undefined") return
	const origins =
		provider === "youtube" && privacy ? NOCOOKIE : ORIGINS[provider]
	if (!origins) return
	for (const origin of origins) {
		if (done.has(origin)) continue
		done.add(origin)
		const link = document.createElement("link")
		link.rel = "preconnect"
		link.href = origin
		link.crossOrigin = ""
		document.head.append(link)
	}
}
