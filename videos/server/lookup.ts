import { secondsToIsoDuration } from "library/videos/seo/videoObjectJsonLd"
import type { LookupContext, VideoProvider } from "library/videos/types"

export type LookupProvider = Exclude<VideoProvider, "mux" | "file">
export type LookupKind = "poster" | "meta" | "copy"
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
	provider: LookupProvider
	id: string
	hash?: string
	customerCode?: string
}

export interface LookupOptions extends LookupContext {
	/** Which half of the result the caller needs; the other half is skipped to save upstream requests. */
	want: "poster" | "meta"
}

export type LookupFn = (
	target: LookupTarget,
	options: LookupOptions,
) => Promise<VideoLookupResult>

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_TEXT_BYTES = 2 * 1024 * 1024
const TIMEOUT_MS = 5000

const ID_PATTERNS: Record<LookupProvider, RegExp> = {
	youtube: /^[\w-]{11}$/,
	vimeo: /^\d{1,20}$/,
	wistia: /^[a-z0-9]{10}$/i,
	twitch: /^[\w-]{1,64}$/,
	tiktok: /^\d{6,25}$/,
	spotify: /^[A-Za-z0-9]{22}$/,
	cloudflare: /^[a-f0-9]{32}$/i,
}
const HASH_PATTERN = /^[a-f0-9]{1,32}$/i
const CUSTOMER_CODE_PATTERN = /^[a-z0-9]{1,32}$/i
const SPOTIFY_TYPES = [
	"track",
	"episode",
	"album",
	"playlist",
	"show",
	"artist",
] as const

function isLookupProvider(value: string): value is LookupProvider {
	return Object.hasOwn(ID_PATTERNS, value)
}

/**
 * Validates untrusted query values into a lookup target. Returns null for anything unexpected.
 */
export function parseLookupTarget(input: {
	provider?: string | null
	id?: string | null
	hash?: string | null
	customerCode?: string | null
}): LookupTarget | null {
	const { provider, id, hash, customerCode } = input
	if (!provider || !id || !isLookupProvider(provider)) return null
	if (id.length > 64 || !ID_PATTERNS[provider].test(id)) return null
	if (hash && !HASH_PATTERN.test(hash)) return null
	if (customerCode && !CUSTOMER_CODE_PATTERN.test(customerCode)) return null
	if (provider === "cloudflare" && !customerCode) return null
	return {
		provider,
		id,
		hash: hash || undefined,
		customerCode: customerCode || undefined,
	}
}

type Json = Record<string, unknown>

function asRecord(value: unknown): Json | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Json)
		: null
}

function str(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function num(value: unknown) {
	return typeof value === "number" && Number.isFinite(value) && value > 0
		? value
		: undefined
}

function signalFor(options: LookupOptions) {
	return AbortSignal.any([options.signal, AbortSignal.timeout(TIMEOUT_MS)])
}

async function readCapped(response: Response, maxBytes: number) {
	const declared = Number(response.headers.get("content-length"))
	if (Number.isFinite(declared) && declared > maxBytes) return null
	const reader = response.body?.getReader()
	if (!reader) return null
	const chunks: Uint8Array[] = []
	let total = 0
	for (;;) {
		const { done, value } = await reader.read()
		if (done) break
		total += value.byteLength
		if (total > maxBytes) {
			await reader.cancel()
			return null
		}
		chunks.push(value)
	}
	return Buffer.concat(chunks)
}

async function fetchText(
	url: string,
	options: LookupOptions,
	headers?: Record<string, string>,
) {
	let body: Awaited<ReturnType<typeof readCapped>> = null
	try {
		const response = await fetch(url, {
			cache: "no-store",
			signal: signalFor(options),
			headers,
		})
		if (!response.ok) return null
		body = await readCapped(response, MAX_TEXT_BYTES)
	} catch {
		return null
	}
	if (!body) return null
	return body.toString("utf8")
}

async function fetchJson(
	url: string,
	options: LookupOptions,
	headers?: Record<string, string>,
) {
	const text = await fetchText(url, options, headers)
	if (!text) return null
	try {
		return asRecord(JSON.parse(text))
	} catch {
		return null
	}
}

async function status(url: string, options: LookupOptions) {
	try {
		const response = await fetch(url, {
			method: "HEAD",
			cache: "no-store",
			signal: signalFor(options),
		})
		return response.status
	} catch {
		return 0
	}
}

function metaTag(html: string, property: string) {
	const pattern = new RegExp(
		`<meta[^>]+itemprop=["']${property}["'][^>]+content=["']([^"']*)["']`,
		"i",
	)
	const value = pattern.exec(html)?.[1]
	return value ? value.replace(/&amp;/g, "&").replace(/&quot;/g, '"') : undefined
}

class Meta {
	value: NonNullable<VideoLookupResult["meta"]> = {}
	set(
		key: LookupMetaKey,
		value: string | undefined,
		reliability: LookupReliability,
	) {
		if (value) this.value[key] = { value, reliability }
	}
	get hasAny() {
		return Object.keys(this.value).length > 0
	}
}

function done(
	result: Partial<Omit<VideoLookupResult, "warnings">>,
	warnings: string[],
): VideoLookupResult {
	return { ...result, warnings }
}

async function lookupYouTube(target: LookupTarget, options: LookupOptions) {
	const warnings: string[] = []
	const watch = `https://www.youtube.com/watch?v=${target.id}`
	if (options.want === "poster") {
		const base = `https://i.ytimg.com/vi/${target.id}`
		const candidates = [
			{ file: "maxresdefault", width: 1280, height: 720 },
			{ file: "sddefault", width: 640, height: 480 },
		]
		for (const candidate of candidates) {
			const url = `${base}/${candidate.file}.jpg`
			if ((await status(url, options)) === 200)
				return done(
					{
						poster: {
							url,
							width: candidate.width,
							height: candidate.height,
							provider: "youtube",
						},
					},
					warnings,
				)
		}
		warnings.push(
			"Only the 4:3 thumbnail exists for this video; it has letterbox bars, so display it with object-fit: cover.",
		)
		return done(
			{
				poster: {
					url: `${base}/hqdefault.jpg`,
					width: 480,
					height: 360,
					provider: "youtube",
				},
			},
			warnings,
		)
	}

	const meta = new Meta()
	meta.set("embedUrl", `https://www.youtube.com/embed/${target.id}`, "reliable")
	const oembed = await fetchJson(
		`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`,
		options,
	)
	if (oembed) {
		meta.set("title", str(oembed.title), "reliable")
		meta.set("creatorName", str(oembed.author_name), "best-effort")
	} else warnings.push("YouTube oEmbed did not respond; the video may be private or removed.")

	const apiKey = process.env.YOUTUBE_API_KEY
	const api = apiKey
		? await fetchJson(
				`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${target.id}&key=${encodeURIComponent(apiKey)}`,
				options,
			)
		: null
	const item = Array.isArray(api?.items) ? asRecord(api.items[0]) : null
	if (item) {
		const snippet = asRecord(item.snippet)
		const details = asRecord(item.contentDetails)
		meta.set("description", str(snippet?.description), "reliable")
		meta.set("uploadDate", str(snippet?.publishedAt), "reliable")
		meta.set("duration", str(details?.duration), "reliable")
		meta.set("creatorName", str(snippet?.channelTitle), "reliable")
	} else {
		const html = await fetchText(watch, options, { "Accept-Language": "en" })
		if (html) {
			meta.set("description", metaTag(html, "description"), "best-effort")
			meta.set("uploadDate", metaTag(html, "uploadDate"), "best-effort")
			meta.set("duration", metaTag(html, "duration"), "best-effort")
			warnings.push(
				"Description, upload date and duration come from the watch page and may be missing or wrong.",
			)
		}
	}
	return done({ meta: meta.value }, warnings)
}

async function lookupVimeo(target: LookupTarget, options: LookupOptions) {
	const warnings: string[] = []
	const pageUrl = `https://vimeo.com/${target.id}${target.hash ? `/${target.hash}` : ""}`
	const oembed = await fetchJson(
		`https://vimeo.com/api/oembed.json?width=1280&url=${encodeURIComponent(pageUrl)}`,
		options,
		{ Referer: options.siteURL },
	)
	if (!oembed) {
		warnings.push(
			"Vimeo did not return data. The video may be private, or domain-restricted to a different site.",
		)
		return done({}, warnings)
	}
	if (options.want === "poster") {
		const url = str(oembed.thumbnail_url)
		const width = num(oembed.thumbnail_width)
		const height = num(oembed.thumbnail_height)
		if (!url || !width || !height) {
			warnings.push("Vimeo returned no thumbnail for this video.")
			return done({}, warnings)
		}
		return done({ poster: { url, width, height, provider: "vimeo" } }, warnings)
	}
	const meta = new Meta()
	meta.set("title", str(oembed.title), "reliable")
	meta.set("description", str(oembed.description), "reliable")
	const duration = num(oembed.duration)
	meta.set("duration", duration ? secondsToIsoDuration(duration) : undefined, "reliable")
	meta.set("creatorName", str(oembed.author_name), "best-effort")
	const uploaded = str(oembed.upload_date)?.slice(0, 10)
	meta.set(
		"uploadDate",
		uploaded && /^\d{4}-\d{2}-\d{2}$/.test(uploaded) ? uploaded : undefined,
		"best-effort",
	)
	if (!target.hash)
		meta.set(
			"embedUrl",
			`https://player.vimeo.com/video/${target.id}`,
			"reliable",
		)
	else
		warnings.push("Unlisted Vimeo video: no embed URL proposed for structured data.")
	return done({ meta: meta.value }, warnings)
}

async function lookupWistia(target: LookupTarget, options: LookupOptions) {
	const warnings: string[] = []
	const oembed = await fetchJson(
		`https://fast.wistia.com/oembed?format=json&url=${encodeURIComponent(`https://fast.wistia.com/medias/${target.id}`)}`,
		options,
	)
	if (!oembed) {
		warnings.push("Wistia did not return data for this video.")
		return done({}, warnings)
	}
	if (options.want === "poster") {
		const raw = str(oembed.thumbnail_url)
		if (!raw) {
			warnings.push("Wistia returned no thumbnail for this video.")
			return done({}, warnings)
		}
		let url = raw
		let width = num(oembed.thumbnail_width)
		let height = num(oembed.thumbnail_height)
		try {
			const parsed = new URL(raw)
			if (parsed.searchParams.has("image_crop_resized")) {
				parsed.searchParams.set("image_crop_resized", "1280x720")
				url = parsed.toString()
				width = 1280
				height = 720
			}
		} catch {
			return done({}, warnings)
		}
		if (!width || !height) return done({}, warnings)
		return done({ poster: { url, width, height, provider: "wistia" } }, warnings)
	}
	const meta = new Meta()
	meta.set("title", str(oembed.title), "reliable")
	const duration = num(oembed.duration)
	meta.set("duration", duration ? secondsToIsoDuration(duration) : undefined, "reliable")
	meta.set(
		"embedUrl",
		`https://fast.wistia.net/embed/iframe/${target.id}`,
		"reliable",
	)
	const extra = await fetchJson(
		`https://fast.wistia.net/embed/medias/${target.id}.json`,
		options,
	)
	const media = asRecord(asRecord(extra?.media))
	if (media) {
		const created = num(media.createdAt)
		meta.set(
			"uploadDate",
			created ? new Date(created * 1000).toISOString() : undefined,
			"best-effort",
		)
		meta.set("description", str(media.seoDescription), "best-effort")
		if (Array.isArray(media.assets)) {
			for (const asset of media.assets) {
				const record = asRecord(asset)
				const url = str(record?.url)
				if (record?.type === "mp4_video" && url) {
					meta.set("contentUrl", url, "best-effort")
					break
				}
			}
		}
		warnings.push(
			"Upload date, description and file URL come from an undocumented Wistia endpoint.",
		)
	}
	return done({ meta: meta.value }, warnings)
}

async function lookupSpotify(target: LookupTarget, options: LookupOptions) {
	const warnings: string[] = []
	for (const type of SPOTIFY_TYPES) {
		const oembed = await fetchJson(
			`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/${type}/${target.id}`)}`,
			options,
		)
		if (!oembed) continue
		if (options.want === "poster") {
			const url = str(oembed.thumbnail_url)
			if (!url) break
			return done(
				{
					poster: {
						url,
						width: num(oembed.thumbnail_width) ?? 300,
						height: num(oembed.thumbnail_height) ?? 300,
						provider: "spotify",
					},
				},
				[
					"Spotify asks that its artwork is not stored indefinitely. Prefer an uploaded poster.",
				],
			)
		}
		const meta = new Meta()
		meta.set("title", str(oembed.title), "reliable")
		return done({ meta: meta.value }, warnings)
	}
	warnings.push("Spotify did not return data for this ID.")
	return done({}, warnings)
}

async function lookupCloudflare(target: LookupTarget, options: LookupOptions) {
	const warnings: string[] = []
	const base = `https://customer-${target.customerCode}.cloudflarestream.com/${target.id}`
	if (options.want === "poster")
		return done(
			{
				poster: {
					url: `${base}/thumbnails/thumbnail.jpg?height=720`,
					width: 1280,
					height: 720,
					provider: "cloudflare",
				},
			},
			["Cloudflare thumbnail size assumes a 16:9 video."],
		)
	const meta = new Meta()
	meta.set("embedUrl", `${base}/iframe`, "reliable")
	const manifest = await fetchText(`${base}/manifest/video.mpd`, options)
	const seconds = manifest
		? /mediaPresentationDuration="PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?"/.exec(
				manifest,
			)
		: null
	if (seconds) {
		const total =
			Number(seconds[1] ?? 0) * 3600 +
			Number(seconds[2] ?? 0) * 60 +
			Number(seconds[3] ?? 0)
		if (total > 0) meta.set("duration", secondsToIsoDuration(total), "best-effort")
	}
	warnings.push("Cloudflare Stream has no public title or upload date lookup.")
	return done({ meta: meta.value }, warnings)
}

async function lookupTikTok(target: LookupTarget, options: LookupOptions) {
	if (options.want === "poster")
		return done({}, ["TikTok has no public thumbnail. Upload a poster."])
	const meta = new Meta()
	meta.set(
		"embedUrl",
		`https://www.tiktok.com/player/v1/${target.id}`,
		"best-effort",
	)
	return done({ meta: meta.value }, [
		"TikTok provides no title, thumbnail or duration.",
	])
}

async function lookupTwitch(_target: LookupTarget, options: LookupOptions) {
	return done({}, [
		options.want === "poster"
			? "Twitch has no public thumbnail. Upload a poster."
			: "Twitch provides no public metadata.",
	])
}

export const LOOKUPS: Record<LookupProvider, LookupFn> = {
	youtube: lookupYouTube,
	vimeo: lookupVimeo,
	wistia: lookupWistia,
	spotify: lookupSpotify,
	cloudflare: lookupCloudflare,
	tiktok: lookupTikTok,
	twitch: lookupTwitch,
}

export async function runLookup(
	target: LookupTarget,
	options: LookupOptions,
): Promise<VideoLookupResult> {
	return await LOOKUPS[target.provider](target, options)
}

export interface LookupCopy {
	bytes: Buffer
	contentType: string
}

/**
 * Downloads the provider-derived poster image. The URL is never caller supplied.
 */
export async function lookupCopy(
	target: LookupTarget,
	context: LookupContext,
): Promise<LookupCopy | { error: string; status: number }> {
	const options: LookupOptions = { ...context, want: "poster" }
	const result = await runLookup(target, options)
	const poster = result.poster
	if (!poster) return { error: "No poster available", status: 404 }
	let url: URL
	try {
		url = new URL(poster.url)
	} catch {
		return { error: "Invalid poster URL", status: 502 }
	}
	if (url.protocol !== "https:")
		return { error: "Poster is not served over https", status: 502 }
	const headers: Record<string, string> | undefined =
		target.provider === "vimeo" ? { Referer: context.siteURL } : undefined
	try {
		const response = await fetch(url, {
			cache: "no-store",
			signal: signalFor(options),
			headers,
		})
		if (!response.ok) return { error: "Poster fetch failed", status: 502 }
		const contentType = response.headers.get("content-type")
		if (!contentType || !contentType.toLowerCase().startsWith("image/"))
			return { error: "Poster is not an image", status: 502 }
		const bytes = await readCapped(response, MAX_IMAGE_BYTES)
		if (!bytes) return { error: "Poster is larger than 5 MB", status: 413 }
		return { bytes, contentType }
	} catch {
		return { error: "Poster fetch failed", status: 502 }
	}
}
