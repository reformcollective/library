import type { MuxTokens } from "library/videos/types"

/** Default Mux poster time in seconds. Frame 0 is often a dark fade-in frame; 0.04 s is past it for typical footage. */
export const DEFAULT_MUX_POSTER_TIME = 0.04

export interface PosterSource {
	src: string
	width: number
	height: number
}

export interface AspectSize {
	width: number
	height: number
}

/** Accepts 1.777, "16:9", "16/9" or "16 / 9". */
export function parseAspectRatio(
	input: number | string | null | undefined,
): AspectSize | null {
	if (typeof input === "number") {
		if (!Number.isFinite(input) || input <= 0) return null
		return { width: input, height: 1 }
	}
	if (!input) return null
	const parts = input.split(/[:/]/).map((part) => Number.parseFloat(part))
	const [width, height] = parts
	if (parts.length === 2 && width && height && width > 0 && height > 0)
		return { width, height }
	const single = Number.parseFloat(input)
	if (parts.length === 1 && Number.isFinite(single) && single > 0)
		return { width: single, height: 1 }
	return null
}

/** Falls back to 16 / 9 so the stage never collapses when the ratio is unknown. */
export function aspectRatioToCss(aspect: AspectSize | null): string {
	if (!aspect) return "16 / 9"
	return `${aspect.width} / ${aspect.height}`
}

export interface MuxThumbnailOptions {
	time?: number
	width: number
	tokens?: MuxTokens
	customDomain?: string
}

export function muxThumbnailUrl(
	playbackId: string,
	{ time, width, tokens, customDomain }: MuxThumbnailOptions,
): string {
	const host = customDomain ? `image.${customDomain}` : "image.mux.com"
	const base = `https://${host}/${playbackId}/thumbnail.webp`
	if (tokens?.thumbnail)
		return `${base}?token=${encodeURIComponent(tokens.thumbnail)}`
	const params = new URLSearchParams()
	if (time !== undefined && Number.isFinite(time) && time >= 0)
		params.set("time", String(time))
	params.set("width", String(width))
	return `${base}?${params.toString()}`
}

export function muxPosterSource(
	playbackId: string,
	aspect: AspectSize | null,
	options: Omit<MuxThumbnailOptions, "width">,
): PosterSource {
	const width = 1280
	const ratio = aspect ? aspect.width / aspect.height : 16 / 9
	return {
		src: muxThumbnailUrl(playbackId, { ...options, width }),
		width,
		height: Math.round(width / ratio),
	}
}
