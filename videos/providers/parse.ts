import type { VideoField } from "library/sanity/assetMetadata"
import type {
	ResolvedSource,
	VideoFileSource,
	VideoProvider,
} from "library/videos/types"

type EmbedProvider = Exclude<VideoProvider, "mux" | "file">
type EmbedSource = Extract<ResolvedSource, { id: string }>

const ID_YOUTUBE = /^[\w-]{11}$/
const ID_VIMEO = /^\d+$/
const ID_WISTIA = /^[a-z0-9]{10}$/i
const ID_TIKTOK = /^\d{6,}$/
const ID_SPOTIFY = /^[A-Za-z0-9]{22}$/
const ID_CLOUDFLARE = /^[a-f0-9]{32}$/i
const SPOTIFY_TYPES = new Set([
	"track",
	"album",
	"playlist",
	"episode",
	"show",
	"artist",
])

function hostMatches(host: string, domain: string) {
	return host === domain || host.endsWith(`.${domain}`)
}

function toUrl(input: string) {
	try {
		return new URL(input.trim())
	} catch {
		return null
	}
}

function segments(url: URL) {
	return url.pathname.split("/").filter(Boolean)
}

function embed(
	provider: EmbedProvider,
	url: string,
	id: string,
	extra?: Partial<EmbedSource>,
): EmbedSource {
	return { provider, id, url, ...extra }
}

function parseYouTube(url: URL, input: string) {
	const host = url.hostname.toLowerCase()
	const parts = segments(url)
	let id: string | undefined
	if (host === "youtu.be") id = parts[0]
	else if (
		hostMatches(host, "youtube.com") ||
		hostMatches(host, "youtube-nocookie.com")
	) {
		if (parts[0] === "watch") id = url.searchParams.get("v") ?? undefined
		else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? ""))
			id = parts[1]
	} else return null
	return id && ID_YOUTUBE.test(id) ? embed("youtube", input, id) : null
}

function parseVimeo(url: URL, input: string) {
	const host = url.hostname.toLowerCase()
	if (!hostMatches(host, "vimeo.com")) return null
	const parts = segments(url)
	const numeric = parts.findIndex((part) => ID_VIMEO.test(part))
	if (numeric === -1) return null
	const id = parts[numeric] as string
	const next = parts[numeric + 1]
	const hash =
		url.searchParams.get("h") ??
		(next && /^[a-f0-9]+$/i.test(next) ? next : undefined)
	return embed("vimeo", input, id, hash ? { hash } : undefined)
}

function parseWistia(url: URL, input: string) {
	const host = url.hostname.toLowerCase()
	if (
		!hostMatches(host, "wistia.com") &&
		!hostMatches(host, "wistia.net") &&
		host !== "wi.st"
	)
		return null
	const parts = segments(url)
	const id =
		parts[0] === "medias" || parts[0] === "embed"
			? parts[parts.length - 1]
			: undefined
	return id && ID_WISTIA.test(id) ? embed("wistia", input, id) : null
}

function parseTwitch(url: URL, input: string) {
	const host = url.hostname.toLowerCase()
	const parts = segments(url)
	if (host === "clips.twitch.tv") {
		const slug = parts[0] === "embed" ? url.searchParams.get("clip") : parts[0]
		return slug ? embed("twitch", input, slug, { kind: "clip" }) : null
	}
	if (host === "player.twitch.tv") {
		const video = url.searchParams.get("video")
		const channel = url.searchParams.get("channel")
		const collection = url.searchParams.get("collection")
		if (video)
			return embed("twitch", input, video.replace(/^v/, ""), { kind: "video" })
		if (channel) return embed("twitch", input, channel, { kind: "channel" })
		if (collection)
			return embed("twitch", input, collection, { kind: "collection" })
		return null
	}
	if (!hostMatches(host, "twitch.tv")) return null
	if (parts[0] === "videos" && parts[1])
		return embed("twitch", input, parts[1], { kind: "video" })
	if (parts[0] === "collections" && parts[1])
		return embed("twitch", input, parts[1], { kind: "collection" })
	if (parts[1] === "clip" && parts[2])
		return embed("twitch", input, parts[2], { kind: "clip" })
	if (parts[0] && parts.length === 1)
		return embed("twitch", input, parts[0], { kind: "channel" })
	return null
}

function parseTikTok(url: URL, input: string) {
	const host = url.hostname.toLowerCase()
	if (
		!hostMatches(host, "tiktok.com") ||
		host.startsWith("vm.") ||
		host.startsWith("vt.")
	)
		return null
	const parts = segments(url)
	let id: string | undefined
	const videoIndex = parts.indexOf("video")
	if (videoIndex !== -1) id = parts[videoIndex + 1]
	else if (parts[0] === "player" || parts[0] === "embed")
		id = parts[parts.length - 1]
	return id && ID_TIKTOK.test(id) ? embed("tiktok", input, id) : null
}

function parseSpotify(url: URL, input: string) {
	const host = url.hostname.toLowerCase()
	if (host !== "open.spotify.com" && host !== "spotify.link") return null
	const parts = segments(url).filter(
		(part) => part !== "embed" && !part.startsWith("intl-"),
	)
	const type = parts[0]
	const id = parts[1]
	return type && id && SPOTIFY_TYPES.has(type) && ID_SPOTIFY.test(id)
		? embed("spotify", input, id)
		: null
}

function parseCloudflare(url: URL, input: string) {
	const host = url.hostname.toLowerCase()
	const customer = /^customer-([a-z0-9]+)\.cloudflarestream\.com$/.exec(host)
	const known =
		customer ||
		host === "cloudflarestream.com" ||
		host === "videodelivery.net" ||
		host === "iframe.videodelivery.net"
	if (!known) return null
	const id = segments(url)[0]
	if (!id || !ID_CLOUDFLARE.test(id)) return null
	const customerCode = customer?.[1]
	return embed(
		"cloudflare",
		input,
		id,
		customerCode ? { customerCode } : undefined,
	)
}

const PARSERS: Record<
	EmbedProvider,
	(url: URL, input: string) => EmbedSource | null
> = {
	youtube: parseYouTube,
	vimeo: parseVimeo,
	wistia: parseWistia,
	twitch: parseTwitch,
	tiktok: parseTikTok,
	spotify: parseSpotify,
	cloudflare: parseCloudflare,
}

function pathExtension(input: string) {
	const url = toUrl(input)
	const path = url ? url.pathname : (input.split(/[?#]/)[0] ?? "")
	const match = /\.([a-z0-9]+)$/i.exec(path)
	return match?.[1]?.toLowerCase()
}

function isFileLike(input: string) {
	const trimmed = input.trim()
	if (trimmed.startsWith("/") || trimmed.startsWith("./")) return true
	const url = toUrl(trimmed)
	return url !== null && (url.protocol === "http:" || url.protocol === "https:")
}

/**
 * Detects the provider from a pasted URL. Returns null for unsupported input,
 * including DASH (.mpd) and TikTok short links.
 */
export function parseVideoUrl(input: string): ResolvedSource | null {
	const trimmed = input.trim()
	if (!trimmed) return null
	const url = toUrl(trimmed)
	if (url) {
		for (const provider of Object.keys(PARSERS) as EmbedProvider[]) {
			const parsed = PARSERS[provider](url, trimmed)
			if (parsed) return parsed
		}
	}
	if (!isFileLike(trimmed)) return null
	const extension = pathExtension(trimmed)
	if (extension === "mpd") return null
	if (extension === "m3u8")
		return { provider: "file", format: "hls", sources: [{ src: trimmed }] }
	return {
		provider: "file",
		format: "native",
		sources: [{ src: trimmed }],
	}
}

const EMBED_SOURCE_TYPES: ReadonlySet<string> = new Set(Object.keys(PARSERS))

/**
 * Resolves the Sanity `video` object plus optional prop overrides to one source.
 * Callers must `stegaClean` the object first. Returns null when nothing usable is found.
 */
export function resolveSource(
	video: VideoField | undefined,
	overrides?: { src?: string | VideoFileSource[]; playbackId?: string },
): ResolvedSource | null {
	const playbackId = overrides?.playbackId
	if (playbackId) return { provider: "mux", playbackId }

	const src = overrides?.src
	if (Array.isArray(src)) {
		if (src.length === 0) return null
		const hls = src.some(
			(source) =>
				source.type === "application/x-mpegURL" ||
				pathExtension(source.src) === "m3u8",
		)
		return {
			provider: "file",
			format: hls ? "hls" : "native",
			sources: src,
		}
	}
	if (typeof src === "string") return parseVideoUrl(src)

	if (!video) return null
	const sourceType = video.sourceType
	if (sourceType === "mux") {
		const muxId = video.muxVideo?.data?.playbackId
		return muxId ? { provider: "mux", playbackId: muxId } : null
	}
	if (!video.url) return null
	const parsed = parseVideoUrl(video.url)
	if (sourceType && EMBED_SOURCE_TYPES.has(sourceType)) {
		if (parsed?.provider === sourceType) return parsed
		if (process.env.NODE_ENV !== "production")
			console.warn(
				`UniversalVideo: url does not match sourceType "${sourceType}"`,
				video.url,
			)
		return null
	}
	return parsed
}
