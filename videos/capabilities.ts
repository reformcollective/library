import type { Support, VideoProvider } from "library/videos/types"

export const VIDEO_FEATURES = [
	"play",
	"seek",
	"muted",
	"volume",
	"playbackRate",
	"loop",
	"autoplay",
	"startTime",
	"endTime",
	"hideChrome",
	"fullscreen",
	"pip",
	"remotePlayback",
	"captions",
	"captionDefault",
	"audioTracks",
	"qualitySelect",
	"qualityCap",
	"chapters",
	"timeRead",
	"ended",
	"error",
	"background",
	"privacy",
	"providerPoster",
	"metadata",
	"signed",
	"live",
] as const

export type VideoFeature = (typeof VIDEO_FEATURES)[number]

const Y: Support = "yes"
const B: Support = "best-effort"
const N: Support = "no"
const U: Support = "unverified"

const PROVIDERS = [
	"mux",
	"file",
	"youtube",
	"vimeo",
	"wistia",
	"twitch",
	"tiktok",
	"spotify",
	"cloudflare",
] as const satisfies readonly VideoProvider[]

/** Rows follow the order of PROVIDERS: mux, file, youtube, vimeo, wistia, twitch, tiktok, spotify, cloudflare. */
const MATRIX: Record<VideoFeature, readonly Support[]> = {
	play: [Y, Y, Y, Y, Y, Y, Y, Y, Y],
	seek: [Y, Y, Y, Y, Y, Y, Y, Y, Y],
	muted: [Y, Y, Y, Y, Y, Y, Y, N, Y],
	volume: [Y, Y, Y, B, Y, Y, N, N, Y],
	playbackRate: [Y, Y, B, B, Y, N, N, N, B],
	loop: [Y, Y, Y, Y, Y, N, B, N, Y],
	autoplay: [Y, Y, B, Y, Y, B, B, N, B],
	startTime: [Y, Y, Y, Y, Y, Y, N, Y, Y],
	endTime: [B, B, Y, B, B, B, B, B, B],
	hideChrome: [Y, Y, Y, B, Y, B, Y, N, Y],
	fullscreen: [Y, Y, Y, Y, Y, Y, Y, Y, Y],
	pip: [Y, Y, U, Y, U, N, N, N, U],
	remotePlayback: [Y, Y, U, Y, U, N, N, N, U],
	captions: [Y, Y, B, Y, U, B, N, N, N],
	captionDefault: [Y, Y, Y, Y, B, N, N, N, Y],
	audioTracks: [Y, B, N, Y, U, N, N, N, U],
	qualitySelect: [U, U, N, B, U, Y, N, N, U],
	qualityCap: [Y, U, N, B, U, N, N, N, U],
	chapters: [Y, Y, N, Y, N, N, N, N, N],
	timeRead: [Y, Y, Y, Y, Y, Y, Y, Y, Y],
	ended: [Y, Y, B, Y, Y, Y, Y, B, Y],
	error: [Y, Y, Y, Y, U, B, Y, B, Y],
	background: [Y, Y, B, B, B, N, B, N, B],
	privacy: [Y, N, Y, B, U, N, N, N, U],
	providerPoster: [Y, N, Y, Y, Y, N, N, Y, B],
	metadata: [B, N, B, Y, B, N, N, B, N],
	signed: [Y, N, N, B, B, N, N, N, B],
	live: [Y, B, U, U, U, Y, N, N, U],
}

export const CAPABILITIES = Object.fromEntries(
	PROVIDERS.map((provider, column) => [
		provider,
		Object.fromEntries(
			VIDEO_FEATURES.map((feature) => [feature, MATRIX[feature][column]]),
		),
	]),
) as Record<VideoProvider, Record<VideoFeature, Support>>

/** Plain-language limits per source. Feeds Sanity field descriptions, upload instructions and JSDoc. */
export const LIMITATIONS: Record<VideoProvider, string[]> = {
	mux: [
		"The automatic poster from Mux can look lighter than the video for assets without color tags. Upload a poster, or re-encode to limited-range bt709 before uploading.",
		"Free-plan assets show a Mux logo.",
	],
	file: [
		"MP4 files need fast-start and HTTP range support for smooth progressive playback.",
		"DASH (.mpd) is not supported. Use an MP4 or HLS (.m3u8) URL.",
		"No automatic poster. Upload one or the first frame is shown.",
	],
	youtube: [
		"Not recommended inside looping carousels or sliders: iframe players cannot be loaded, paused or hidden reliably. Use MP4 or Mux there.",
		"Playback rate is not guaranteed.",
		"Controls overlay the video by default. YouTube's developer policy discourages overlaying its player, so use controlsPlacement=\"below\" where that matters.",
		"Background mode works but is discouraged by YouTube's rules.",
	],
	vimeo: [
		"Not recommended inside looping carousels or sliders: iframe players cannot be loaded, paused or hidden reliably. Use MP4 or Mux there.",
		"Background, hidden controls, playback rate and quality may need a paid Vimeo plan.",
		"Volume cannot be set on mobile.",
		"Unlisted videos need their hash in the URL.",
	],
	wistia: [
		"Not recommended inside looping carousels or sliders: iframe players cannot be loaded, paused or hidden reliably. Use MP4 or Mux there.",
		"Loads Wistia's legacy player script.",
		"Domain-restricted media needs a page referrer policy that sends the origin.",
	],
	twitch: [
		"Not recommended inside looping carousels or sliders: iframe players cannot be loaded, paused or hidden reliably. Use MP4 or Mux there.",
		"Requires the site's hostname to be allowed as the embed parent; minimum size 400x300.",
		"No loop, no playback rate, no background mode.",
		"Clips have no playback controls from our side.",
		"No automatic poster.",
	],
	tiktok: [
		"Not recommended inside looping carousels or sliders: iframe players cannot be loaded, paused or hidden reliably. Use MP4 or Mux there.",
		"No volume control, no start time, no automatic poster.",
		"Short links are not supported. Use the full video URL.",
		"Per-domain rate limits can make the player unavailable.",
		"Loop is set at load only.",
		"Autoplay is best-effort: TikTok rejects script-started playback in some browsers and shows its own play button.",
	],
	spotify: [
		"Not recommended inside looping carousels or sliders: iframe players cannot be loaded, paused or hidden reliably. Use MP4 or Mux there.",
		"Audio-first embed: no mute, volume, loop, autoplay or background mode.",
		"Plays a preview only without DRM support or login.",
	],
	cloudflare: [
		"Not recommended inside looping carousels or sliders: iframe players cannot be loaded, paused or hidden reliably. Use MP4 or Mux there.",
		"Needs the full Cloudflare Stream URL including the customer code.",
		"Start time and default captions are read only when the player loads.",
		"Mobile autoplay is generally unsupported.",
	],
}

/** Sanity field options and the features that must be supported for the option to be offered. */
export const SANITY_OPTION_FEATURES: Record<string, VideoFeature[]> = {
	"mode.background": ["background"],
	"mode.autoplay": ["autoplay"],
	loop: ["loop"],
	muted: ["muted"],
	controls: ["hideChrome"],
	startTime: ["startTime"],
	endTime: ["endTime"],
	privacy: ["privacy"],
	thumbnail: ["providerPoster"],
	chapters: ["chapters"],
}

/** Unverified cells count as "no" for UI decisions until a spike confirms them. */
export function supports(provider: VideoProvider, feature: VideoFeature): Support {
	const value = CAPABILITIES[provider][feature]
	return value === "unverified" ? "no" : value
}
