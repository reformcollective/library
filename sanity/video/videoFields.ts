import type { VideoFeature } from "library/videos/capabilities"
import {
	LIMITATIONS,
	SANITY_OPTION_FEATURES,
	supports,
} from "library/videos/capabilities"
import { parseVideoUrl } from "library/videos/providers/parse"
import type { VideoProvider } from "library/videos/types"
import { defineField } from "sanity"

export const VIDEO_SOURCE_TYPES = [
	{ title: "Upload or Select a File", value: "mux" },
	{ title: "YouTube", value: "youtube" },
	{ title: "Vimeo", value: "vimeo" },
	{ title: "Wistia", value: "wistia" },
	{ title: "Spotify", value: "spotify" },
	{ title: "Twitch", value: "twitch" },
	{ title: "TikTok", value: "tiktok" },
	{ title: "Cloudflare Stream", value: "cloudflare" },
	{ title: "Video URL", value: "url" },
]

const PROVIDER_LABELS: Record<VideoProvider, string> = {
	mux: "Uploaded file (Mux)",
	file: "Video URL",
	youtube: "YouTube",
	vimeo: "Vimeo",
	wistia: "Wistia",
	twitch: "Twitch",
	tiktok: "TikTok",
	spotify: "Spotify",
	cloudflare: "Cloudflare Stream",
}

export const MUX_POSTER_WORKAROUND =
	'If the automatic poster looks lighter than the video, upload a poster image, or re-encode the file to limited-range bt709 before uploading: ffmpeg -i in.mp4 -vf "scale=in_range=full:out_range=limited:out_color_matrix=bt709,format=yuv420p" -c:v libx264 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv out.mp4'

interface VideoSourceValue {
	sourceType?: string
	url?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

export function providerOf(value: unknown): VideoProvider | null {
	if (value !== undefined && !isRecord(value)) return null
	const source: VideoSourceValue = value ?? {}
	const sourceType =
		typeof source.sourceType === "string" ? source.sourceType : "mux"
	if (sourceType === "mux") return "mux"
	if (sourceType === "url") {
		const url = typeof source.url === "string" ? source.url : ""
		return parseVideoUrl(url)?.provider ?? "file"
	}
	const provider = Object.keys(PROVIDER_LABELS).find(
		(key) => key === sourceType,
	)
	return provider ? (provider as VideoProvider) : null
}

export function featureSupport(parent: unknown, feature: VideoFeature) {
	const provider = providerOf(parent)
	return provider ? supports(provider, feature) : "yes"
}

function optionHidden(option: string) {
	return ({ parent }: { parent?: unknown }) => {
		const features = SANITY_OPTION_FEATURES[option] ?? []
		return features.some((feature) => featureSupport(parent, feature) === "no")
	}
}

function limitsFor(providers: VideoProvider[]) {
	return providers
		.map(
			(provider) =>
				`${PROVIDER_LABELS[provider]}: ${LIMITATIONS[provider].join(" ")}`,
		)
		.join(" ")
}

const ALL_PROVIDERS = Object.keys(PROVIDER_LABELS) as VideoProvider[]

const MUX_LIMITS = limitsFor(["mux"])
const FILE_LIMITS = limitsFor(["file"])

export const MUX_DESCRIPTION = `${MUX_LIMITS} ${MUX_POSTER_WORKAROUND}`

function sourceTypeOf(parent: unknown) {
	if (!isRecord(parent)) return undefined
	return typeof parent.sourceType === "string" ? parent.sourceType : undefined
}

function startTimeOf(parent: unknown) {
	if (!isRecord(parent)) return undefined
	if (featureSupport(parent, "startTime") === "no") return undefined
	return typeof parent.startTime === "number" ? parent.startTime : undefined
}

export const videoSourceFields = [
	defineField({
		name: "sourceType",
		type: "string",
		title: "Source",
		description: limitsFor(ALL_PROVIDERS),
		options: { list: VIDEO_SOURCE_TYPES },
		initialValue: "mux",
	}),
	defineField({
		name: "url",
		type: "url",
		title: "Video URL",
		description: `Paste the full address. For Video URL you can paste a file URL, an HLS (.m3u8) URL or a provider URL. DASH (.mpd) is not supported. ${FILE_LIMITS}`,
		hidden: ({ parent }) => {
			const sourceType = sourceTypeOf(parent)
			return !sourceType || sourceType === "mux"
		},
		validation: (rule) =>
			rule.custom((value, context) => {
				const sourceType = sourceTypeOf(context.parent)
				if (!sourceType || sourceType === "mux") return true
				if (!value) return sourceType === "url" ? true : "URL is required"
				if (/\.mpd(?:[?#]|$)/i.test(value))
					return "DASH (.mpd) is not supported. Use an MP4 or HLS (.m3u8) URL."
				const parsed = parseVideoUrl(value)
				if (parsed?.provider === "cloudflare" && !parsed.customerCode)
					return "Use the full Cloudflare Stream URL including the customer- host, for example https://customer-xxxx.cloudflarestream.com/<id>/watch"
				if (sourceType === "url")
					return parsed ? true : "This doesn't look like a valid video URL"
				if (parsed?.provider === sourceType) return true
				const label = VIDEO_SOURCE_TYPES.find(
					(type) => type.value === sourceType,
				)?.title
				return `This doesn't look like a valid ${label} URL`
			}),
	}),
	defineField({
		name: "muxVideo",
		type: "mux.video",
		title: "Mux Video",
		description: MUX_DESCRIPTION,
		hidden: ({ parent }) => sourceTypeOf(parent) !== "mux",
	}),
]

export const videoOptionFields = [
	defineField({
		name: "thumbnail",
		type: "object",
		title: "Provider thumbnail",
		readOnly: true,
		hidden: true,
		fields: [
			defineField({ name: "url", type: "url", title: "URL" }),
			defineField({ name: "width", type: "number", title: "Width" }),
			defineField({ name: "height", type: "number", title: "Height" }),
			defineField({ name: "provider", type: "string", title: "Provider" }),
			defineField({ name: "fetchedAt", type: "string", title: "Fetched at" }),
		],
	}),
	defineField({
		name: "mode",
		type: "string",
		title: "Playback mode",
		description:
			"Click shows a poster and plays on click. Autoplay starts muted when it scrolls into view. Background loops muted with no controls. YouTube background mode works but is discouraged by YouTube's rules.",
		options: {
			list: [
				{ title: "Play on click", value: "click" },
				{ title: "Autoplay", value: "autoplay" },
				{ title: "Background", value: "background" },
			],
			layout: "radio",
		},
		initialValue: "click",
		validation: (rule) =>
			rule.custom((value, context) => {
				if (
					value === "background" &&
					featureSupport(context.parent, "background") === "no"
				)
					return "Background mode is not available for this source"
				if (
					value === "autoplay" &&
					featureSupport(context.parent, "autoplay") === "no"
				)
					return "Autoplay is not available for this source"
				return true
			}),
	}),
	defineField({
		name: "loop",
		type: "boolean",
		title: "Loop",
		description: `Not available for Twitch or Spotify. ${limitsFor(["tiktok"])}`,
		hidden: optionHidden("loop"),
	}),
	defineField({
		name: "muted",
		type: "boolean",
		title: "Muted",
		description: "Always muted for autoplay and background modes.",
		hidden: optionHidden("muted"),
	}),
	defineField({
		name: "controls",
		type: "string",
		title: "Controls",
		description: `Site controls, the provider's own controls, or none. ${limitsFor(["vimeo"])}`,
		options: {
			list: [
				{ title: "Site controls", value: "ours" },
				{ title: "Provider controls", value: "provider" },
				{ title: "None", value: "none" },
			],
			layout: "radio",
		},
		hidden: optionHidden("controls"),
	}),
	defineField({
		name: "startTime",
		type: "number",
		title: "Start time (seconds)",
		validation: (rule) => rule.min(0),
		hidden: optionHidden("startTime"),
	}),
	defineField({
		name: "endTime",
		type: "number",
		title: "End time (seconds)",
		description: "Playback stops here. Must be after the start time.",
		validation: (rule) =>
			rule.min(0).custom((value, context) => {
				const start = startTimeOf(context.parent)
				if (typeof value === "number" && start !== undefined && value <= start)
					return "End time must be after the start time"
				return true
			}),
		hidden: optionHidden("endTime"),
	}),
	defineField({
		name: "chapters",
		type: "array",
		title: "Chapters",
		hidden: optionHidden("chapters"),
		of: [
			{
				type: "object",
				name: "videoChapter",
				fields: [
					defineField({
						name: "startTime",
						type: "number",
						title: "Start (seconds)",
						validation: (rule) => rule.required().min(0),
					}),
					defineField({
						name: "title",
						type: "string",
						title: "Title",
						validation: (rule) => rule.required(),
					}),
				],
				preview: { select: { title: "title", subtitle: "startTime" } },
			},
		],
	}),
	defineField({
		name: "title",
		type: "string",
		title: "Title",
		description:
			"Accessible name of the video. Also used for analytics and the structured data name.",
	}),
	defineField({
		name: "mainContent",
		type: "boolean",
		title: "Main content of the page",
		description:
			"Loads the video eagerly and emits video structured data for search engines. Use for the page's primary video.",
		hidden: ({ parent }) => isRecord(parent) && parent.mode === "background",
	}),
	defineField({
		name: "jsonLd",
		type: "object",
		title: "Structured data",
		description:
			"Used for search engines. Filled by Generate from source and editable. Name, thumbnail and upload date are required for it to be emitted.",
		options: { collapsible: true, collapsed: true },
		hidden: ({ parent }) => isRecord(parent) && parent.mode === "background",
		fields: [
			defineField({
				name: "description",
				type: "text",
				rows: 3,
				title: "Description",
			}),
			defineField({
				name: "uploadDate",
				type: "string",
				title: "Upload date",
				description:
					"ISO 8601, for example 2026-03-14 or 2026-03-14T09:30:00Z.",
			}),
			defineField({
				name: "duration",
				type: "string",
				title: "Duration",
				description: "ISO 8601 duration, for example PT3M25S.",
			}),
			defineField({
				name: "creatorName",
				type: "string",
				title: "Creator name",
			}),
			defineField({
				name: "expires",
				type: "string",
				title: "Expires",
				description:
					"ISO 8601 date after which the video is no longer available.",
			}),
		],
	}),
	defineField({
		name: "privacy",
		type: "boolean",
		title: "Privacy mode",
		description:
			"Uses YouTube's nocookie domain and Vimeo's do-not-track option. Neither replaces cookie consent.",
		initialValue: true,
		hidden: optionHidden("privacy"),
	}),
]
