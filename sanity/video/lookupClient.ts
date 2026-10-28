import type { ResolvedSource, VideoProvider } from "library/videos/types"

export const VIDEO_LOOKUP_ENDPOINT = "/api/video-lookup"

export type LookupReliability = "reliable" | "best-effort"

export type LookupMetaKey =
	| "title"
	| "description"
	| "uploadDate"
	| "duration"
	| "embedUrl"
	| "contentUrl"
	| "creatorName"

export interface VideoLookupResult {
	poster?: {
		url: string
		width: number
		height: number
		provider: VideoProvider
	}
	meta?: Partial<
		Record<LookupMetaKey, { value: string; reliability: LookupReliability }>
	>
	warnings: string[]
}

export interface LookupTarget {
	provider: Exclude<VideoProvider, "mux" | "file">
	id: string
	hash?: string
	customerCode?: string
}

export interface StoredThumbnail {
	url: string
	width: number
	height: number
	provider: VideoProvider
	fetchedAt: string
}

export function toLookupTarget(
	source: ResolvedSource | null,
): LookupTarget | null {
	if (!source || source.provider === "mux" || source.provider === "file")
		return null
	return {
		provider: source.provider,
		id: source.id,
		hash: source.hash,
		customerCode: source.customerCode,
	}
}

export function lookupKey(target: LookupTarget | null) {
	if (!target) return ""
	return `${target.provider}:${target.id}:${target.hash ?? ""}:${target.customerCode ?? ""}`
}

function requestUrl(kind: "poster" | "meta" | "copy", target: LookupTarget) {
	const params = new URLSearchParams({
		kind,
		provider: target.provider,
		id: target.id,
	})
	if (target.hash) params.set("hash", target.hash)
	if (target.customerCode) params.set("customerCode", target.customerCode)
	return `${VIDEO_LOOKUP_ENDPOINT}?${params.toString()}`
}

async function request(kind: "poster" | "meta" | "copy", target: LookupTarget) {
	const response = await fetch(requestUrl(kind, target), {
		method: "GET",
		cache: "no-store",
	})
	if (!response.ok)
		throw new Error(`Lookup failed with status ${response.status}`)
	return response
}

export async function fetchLookup(
	kind: "poster" | "meta",
	target: LookupTarget,
): Promise<VideoLookupResult> {
	const response = await request(kind, target)
	return (await response.json()) as VideoLookupResult
}

export async function fetchThumbnail(
	target: LookupTarget,
): Promise<StoredThumbnail | null> {
	const result = await fetchLookup("poster", target)
	if (!result.poster) return null
	return { ...result.poster, fetchedAt: new Date().toISOString() }
}

export async function fetchCopy(target: LookupTarget): Promise<Blob> {
	const response = await request("copy", target)
	return await response.blob()
}
