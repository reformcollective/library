import type { VideoField } from "library/sanity/assetMetadata"
import { resolveSource } from "library/videos/providers/parse"
import type {
	ResolvedSource,
	VideoJsonLdContext,
	VideoObjectJsonLd,
} from "library/videos/types"

export interface VideoObjectJsonLdInput {
	video: VideoField
	pageUrl?: string
	context?: VideoJsonLdContext
}

function clean(value: string | null | undefined) {
	const trimmed = value?.trim()
	return trimmed ? trimmed : undefined
}

function absolute(url: string | null | undefined, base: string | undefined) {
	const value = clean(url)
	if (!value) return undefined
	try {
		return new URL(value, base).toString()
	} catch {
		return undefined
	}
}

function isoDate(value: string | null | undefined) {
	const trimmed = clean(value)
	if (!trimmed) return undefined
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
	const time = Date.parse(trimmed)
	return Number.isNaN(time) ? undefined : new Date(time).toISOString()
}

/**
 * Seconds to an ISO 8601 duration such as PT1H2M3S.
 */
export function secondsToIsoDuration(seconds: number | null | undefined) {
	if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0)
		return undefined
	const total = Math.round(seconds)
	const hours = Math.floor(total / 3600)
	const minutes = Math.floor((total % 3600) / 60)
	const secs = total % 60
	return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${secs || (!hours && !minutes) ? `${secs}S` : ""}`
}

function muxMp4Name(staticRenditions: unknown) {
	if (typeof staticRenditions !== "object" || staticRenditions === null)
		return undefined
	const files = (staticRenditions as { files?: unknown }).files
	if (!Array.isArray(files)) return undefined
	for (const file of files) {
		if (typeof file !== "object" || file === null) continue
		const name = (file as { name?: unknown }).name
		if (typeof name === "string" && name.endsWith(".mp4")) return name
	}
	return undefined
}

function embedUrlFor(source: ResolvedSource) {
	switch (source.provider) {
		case "youtube":
			return `https://www.youtube.com/embed/${source.id}`
		case "vimeo":
			return `https://player.vimeo.com/video/${source.id}${source.hash ? `?h=${source.hash}` : ""}`
		case "wistia":
			return `https://fast.wistia.net/embed/iframe/${source.id}`
		case "tiktok":
			return `https://www.tiktok.com/player/v1/${source.id}`
		case "cloudflare":
			return source.customerCode
				? `https://customer-${source.customerCode}.cloudflarestream.com/${source.id}/iframe`
				: undefined
		default:
			return undefined
	}
}

/**
 * Builds a schema.org VideoObject from stored Sanity fields only (no network).
 * Returns null when a field Google requires (name, thumbnailUrl, uploadDate) is missing.
 */
export function videoObjectJsonLd({
	video,
	pageUrl,
	context,
}: VideoObjectJsonLdInput): VideoObjectJsonLd | null {
	const source = resolveSource(video)
	if (!source || source.provider === "spotify") return null

	const base = pageUrl ?? context?.pageUrl
	const mux = video.muxVideo?.data
	const isMux = source.provider === "mux"
	const publicMux = isMux && mux?.playbackPolicy !== "signed"

	const name = clean(video.title)
	let thumbnail = absolute(video.posterImage?.data?.url, base)
	if (!thumbnail && video.thumbnail?.provider === source.provider)
		thumbnail = absolute(video.thumbnail.url, base)
	if (!thumbnail && source.provider === "mux" && publicMux) {
		const time = mux?.thumbTime
		thumbnail = `https://image.mux.com/${source.playbackId}/thumbnail.jpg${typeof time === "number" && Number.isFinite(time) ? `?time=${time}` : ""}`
	}
	if (!thumbnail) thumbnail = absolute(context?.fallbackThumbnailUrl, base)

	let uploadDate = isoDate(video.jsonLd?.uploadDate)
	if (!uploadDate && isMux) uploadDate = isoDate(mux?.createdAt)

	if (!name || !thumbnail || !uploadDate) {
		if (process.env.NODE_ENV !== "production")
			console.warn("VideoJsonLd: missing required field(s), not emitted", {
				name: Boolean(name),
				thumbnailUrl: Boolean(thumbnail),
				uploadDate: Boolean(uploadDate),
			})
		return null
	}

	let duration = clean(video.jsonLd?.duration)
	if (!duration && isMux) duration = secondsToIsoDuration(mux?.videoDuration)

	let contentUrl: string | undefined
	if (source.provider === "file")
		contentUrl = absolute(source.sources[0]?.src, base)
	else if (source.provider === "mux" && publicMux) {
		const mp4 = muxMp4Name(mux?.staticRenditions)
		if (mp4) contentUrl = `https://stream.mux.com/${source.playbackId}/${mp4}`
	}

	const creatorName = clean(video.jsonLd?.creatorName)

	const result: VideoObjectJsonLd = {
		"@context": "https://schema.org",
		"@type": "VideoObject",
		name,
		thumbnailUrl: [thumbnail],
		uploadDate,
	}
	const description = clean(video.jsonLd?.description)
	if (description) result.description = description
	if (duration) result.duration = duration
	if (contentUrl) result.contentUrl = contentUrl
	const embedUrl = embedUrlFor(source)
	if (embedUrl) result.embedUrl = embedUrl
	const expires = isoDate(video.jsonLd?.expires)
	if (expires) result.expires = expires
	if (creatorName) result.creator = { "@type": "Person", name: creatorName }
	return result
}
