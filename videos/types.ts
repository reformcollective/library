import type { VideoField } from "library/sanity/assetMetadata"
import type { SanityImageData } from "library/sanity/SanityImage"
import type { VideoFeature } from "library/videos/capabilities"
import type { StaticImageData } from "next/image"
import type { ReactNode, Ref } from "react"

export type { VideoFeature }

export type VideoProvider =
	| "mux"
	| "file"
	| "youtube"
	| "vimeo"
	| "wistia"
	| "twitch"
	| "tiktok"
	| "spotify"
	| "cloudflare"
export type VideoMode = "background" | "autoplay" | "click"
export type VideoStatus =
	| "idle"
	| "loading"
	| "ready"
	| "playing"
	| "paused"
	| "ended"
	| "blocked"
	| "stalled"
	| "error"
export type Support = "yes" | "best-effort" | "no" | "unverified"
export type ProviderCapabilities = Record<VideoFeature, Support>

export interface VideoFileSource {
	src: string
	type?: string
	media?: string
}

export interface MuxTokens {
	playback?: string
	thumbnail?: string
	storyboard?: string
	drm?: string
}

export type ResolvedSource =
	| {
			provider: "mux"
			playbackId: string
			tokens?: MuxTokens
			customDomain?: string
	  }
	| { provider: "file"; format: "native" | "hls"; sources: VideoFileSource[] }
	| {
			provider: Exclude<VideoProvider, "mux" | "file">
			id: string
			url: string
			hash?: string
			customerCode?: string
			kind?: "video" | "channel" | "collection" | "clip"
	  }

export type ParsedSource = ResolvedSource

export interface VideoInViewTrigger {
	/** IntersectionObserver threshold; default 0.1 */
	threshold?: number | number[]
	/** IntersectionObserver rootMargin for the play decision; default "0px" */
	rootMargin?: string
	/** Play only the first time it enters view; default false */
	once?: boolean
	/** Pause when it leaves view; default true */
	pauseWhenOut?: boolean
}

export interface VideoAnalyticsOptions {
	/** Progress thresholds in percent; default [10, 25, 50, 75] */
	progress?: number[]
	/** Overrides the video title used in events */
	title?: string
}

export interface VideoEvent {
	type: "start" | "pause" | "progress" | "complete" | "error"
	provider: VideoProvider
	videoId: string
	title?: string
	url?: string
	currentTime: number
	duration: number
	percent?: number
	errorCode?: string | number
}

export interface VideoError {
	code: string | number
	message: string
	/** True when a retry can help (network, rate limit); false for removed, private or embed-blocked videos. */
	retryable: boolean
	provider: VideoProvider
}

export interface VideoTrack {
	id: string
	label: string
	language?: string
	kind?: "captions" | "subtitles" | "descriptions" | "chapters" | "audio"
	src?: string
	default?: boolean
}

export interface VideoChapter {
	startTime: number
	title: string
}

export interface VideoQuality {
	id: string
	label: string
	height?: number
	bitrate?: number
}

export interface VideoLabels {
	play: string
	pause: string
	mute: string
	unmute: string
	volume: string
	seek: string
	fullscreen: string
	exitFullscreen: string
	captions: string
	captionsOff: string
	playbackRate: string
	quality: string
	audioTrack: string
	chapters: string
	pictureInPicture: string
	cast: string
	loading: string
	retry: string
	errorGeneric: string
	playOverlay: string
	live: string
}

export interface MuxOptions {
	minResolution?: string
	maxResolution?: string
	renditionOrder?: "desc"
	maxAutoResolution?: string
	capRenditionToPlayerSize?: boolean
	preferPlayback?: "mse" | "native"
	preferCmcd?: "query" | "header" | "none"
	assetStartTime?: number
	assetEndTime?: number
	defaultSubtitlesLang?: string
	redundantStreams?: boolean
	streamType?: string
	targetLiveWindow?: number
	liveEdgeOffset?: number
	customDomain?: string
	envKey?: string
	beaconCollectionDomain?: string
	metadata?: Record<string, string>
}

export interface MuxDataOptions {
	envKey?: string
	metadata?: Record<string, string>
}

export interface TwitchExtras {
	getQualities: () => string[]
	getPlaybackStats: () => Record<string, unknown>
	setChannel: (channel: string) => void
	setVideo: (id: string, time?: number) => void
	setCollection: (id: string, videoId?: string) => void
}

export interface TikTokExtras {
	navigateTo: (index: number) => void
}

export interface SpotifyExtras {
	loadEntity: (uri: string, preferVideo?: boolean, startAt?: number) => void
	restart: () => void
}

export interface VimeoExtras {
	getChapters: () => Promise<VideoChapter[]>
}

export interface YouTubeExtras {
	getAvailablePlaybackRates: () => number[]
}

export interface MuxExtras {
	addCuePoints: (cues: { time: number; value: string }[]) => void
	storyboardUrl: string | null
	animatedPreviewUrl: (opts?: {
		start?: number
		end?: number
		width?: number
		fps?: number
	}) => string
}

export interface ProviderExtras {
	twitch?: TwitchExtras
	tiktok?: TikTokExtras
	spotify?: SpotifyExtras
	vimeo?: VimeoExtras
	youtube?: YouTubeExtras
	mux?: MuxExtras
}

export interface VideoFieldAdditions {
	thumbnail?: {
		url?: string
		width?: number
		height?: number
		provider?: string
		fetchedAt?: string
	} | null
	mode?: VideoMode | null
	loop?: boolean | null
	muted?: boolean | null
	controls?: "ours" | "provider" | "none" | null
	startTime?: number | null
	endTime?: number | null
	chapters?: { startTime?: number; title?: string }[] | null
	title?: string | null
	mainContent?: boolean | null
	jsonLd?: {
		description?: string
		uploadDate?: string
		duration?: string
		creatorName?: string
		expires?: string
	} | null
	privacy?: boolean | null
}

export interface VideoJsonLdContext {
	siteName?: string
	pageUrl?: string
	fallbackThumbnailUrl?: string
}

export interface VideoObjectJsonLd {
	"@context": "https://schema.org"
	"@type": "VideoObject"
	name: string
	thumbnailUrl: string[]
	uploadDate: string
	description?: string
	duration?: string
	contentUrl?: string
	embedUrl?: string
	expires?: string
	creator?: { "@type": "Person" | "Organization"; name: string }
}

export interface VideoConfig {
	analytics: boolean | VideoAnalyticsOptions
	canTrack?: () => boolean
	maxConcurrent: number
	lookupEndpoint?: string
}

export interface UniversalVideoProps {
	/** Sanity video object (VideoField). Preferred input. Explicit props below win over fields on this object. */
	video?: VideoField
	/** Plain URL or file sources. Provider is detected from the URL. */
	src?: string | VideoFileSource[]
	/** Legacy Mux input, same as video with sourceType "mux". */
	playbackId?: string
	/** background: muted loop, no controls. autoplay: muted autoplay with controls. click: click to play. Default "click". */
	mode?: VideoMode
	/** Watch-page video: eager player, VideoObject JSON-LD. Only one per page. */
	mainContent?: boolean
	/** Facade before load. "auto" follows the mode table. */
	facade?: boolean | "auto"
	/** LCP element: eager poster with fetchPriority high, player mounts at once, preload auto. Match the Studio lcp option. */
	priority?: boolean
	/** Skip the viewport wait but keep normal priority. */
	eager?: boolean
	/** Logs this instance's lifecycle to the console and the debug store. Also on when `window.__UV_DEBUG` is true. Dev builds only. */
	debug?: boolean
	/** Name used in debug records, `[UV <name>]`. Defaults to the provider and an instance number. */
	debugLabel?: string
	/** IntersectionObserver rootMargin for loading. Default "400px". */
	loadMargin?: string
	/**
	 * Built-in playback trigger. false disables it and, in autoplay and background modes, lets the player autoplay. true uses defaults. Default true for background and autoplay, false for click.
	 * "custom" never creates the built-in trigger and never autoplays: only your own code plays it, through `playFromTrigger` and `pauseFromTrigger` (`useVideoScrollTrigger` does this). Use it so the video cannot start before that code attaches.
	 */
	trigger?: boolean | "custom" | VideoInViewTrigger
	/** Declarative play state. Counts as manual control. */
	play?: boolean
	muted?: boolean
	loop?: boolean
	/** Seconds. */
	startTime?: number
	/** Seconds. Pauses (or loops back to startTime when loop) at this time. */
	endTime?: number
	/** Uploaded poster (Sanity image or static import). Wins over any provider poster. Never blurred. */
	poster?: SanityImageData<"false"> | StaticImageData
	/** Seconds into the video for the automatic Mux poster. Defaults to 0.04 so the poster is close to the video's first visible frame without the dark fade-in frame at 0. Overrides the editor's thumbTime only when set. */
	posterTime?: number
	/** Poster aspect and CLS reserve. Falls back to video.muxVideo.data.videoAspectRatio. */
	aspectRatio?: number | string
	/** Controls: ours (default set), provider chrome, or none. Default depends on mode. */
	controls?: boolean | "provider"
	/** Control placement. Default "overlay". */
	controlsPlacement?: "overlay" | "below"
	/** Render a pause control in background mode. Default true. */
	showPause?: boolean
	/** Accessible label; when absent in background mode the video is aria-hidden. */
	label?: string
	/** Override control labels (i18n). */
	labels?: Partial<VideoLabels>
	/** Default caption state, code only (no Sanity field). Applies where the source supports a default. */
	captions?: "off" | "on"
	chapters?: VideoChapter[]
	privacy?: boolean
	muxData?: boolean | MuxDataOptions
	mux?: MuxOptions
	analytics?: boolean | VideoAnalyticsOptions
	/** Per-video veto. Must be created in a client module; sites set it once through VideoConfigProvider. */
	canTrack?: () => boolean
	onVideoEvent?: (event: VideoEvent) => void
	onReady?: () => void
	onPlay?: () => void
	onPause?: () => void
	onEnded?: () => void
	onError?: (error: VideoError) => void
	onBlocked?: () => void
	onTimeUpdate?: (currentTime: number, duration: number) => void
	className?: string
	ref?: Ref<UniversalVideoHandle>
	children?: ReactNode
}

export interface VideoState {
	status: VideoStatus
	paused: boolean
	ended: boolean
	muted: boolean
	volume: number
	currentTime: number
	duration: number
	bufferedEnd: number
	playbackRate: number
	waiting: boolean
	ready: boolean
	/** True once a frame has been painted while playing. Autoplay and background videos keep their poster until then. */
	framePainted: boolean
	isLive: boolean
	fullscreen: boolean
	textTracks: VideoTrack[]
	activeTextTrack: string | null
	audioTracks: VideoTrack[]
	activeAudioTrack: string | null
	qualities: VideoQuality[]
	activeQuality: string | null
	chapters: VideoChapter[]
	activeChapter: number | null
	error: VideoError | null
	wanted: "play" | "pause" | null
	wantedOrigin: "trigger" | "manual" | null
}

export interface VideoController {
	play: (opts?: { origin?: "user" | "external" }) => Promise<void>
	pause: (opts?: { origin?: "user" | "external" }) => void
	toggle: () => void
	restart: () => void
	seek: (seconds: number) => void
	seekBy: (delta: number) => void
	setMuted: (muted: boolean) => void
	setVolume: (volume: number) => void
	setPlaybackRate: (rate: number) => void
	setTextTrack: (id: string | null) => void
	setAudioTrack: (id: string) => void
	setQuality: (id: string | null) => void
	setChapter: (index: number) => void
	requestFullscreen: () => Promise<void>
	exitFullscreen: () => Promise<void>
	requestPictureInPicture: () => Promise<void>
	promptRemotePlayback: () => Promise<void>
	releaseManualControl: () => void
	retry: () => void
	onExtra: (name: string, listener: (detail: unknown) => void) => () => void
	getState: () => VideoState
	subscribe: (listener: () => void) => () => void
	capabilities: ProviderCapabilities
	extras: ProviderExtras
}

export interface UniversalVideoHandle extends VideoController {
	/** Plays as the trigger would: ignored while manual control is active. For custom trigger code such as `useVideoScrollTrigger`. */
	playFromTrigger: () => void
	/** Pauses as the trigger would: ignored while manual control is active. */
	pauseFromTrigger: () => void
	/**
	 * Makes custom trigger code the only driver of `playFromTrigger` and `pauseFromTrigger`: the built-in in-view trigger stops playing, pausing and taking `maxConcurrent` slots until every claim is released. Returns the release function. `useVideoScrollTrigger` calls it for you.
	 */
	claimTrigger: () => () => void
	container: HTMLElement | null
	media: HTMLElement | null
}

export interface LookupContext {
	siteURL: string
	signal: AbortSignal
}

export type AdapterEvent =
	| { type: "ready" }
	| { type: "loading" }
	| { type: "firstFrame" }
	| { type: "playing" }
	| { type: "paused" }
	| { type: "waiting" }
	| { type: "ended" }
	| { type: "blocked" }
	| {
			type: "time"
			currentTime: number
			duration: number
			bufferedEnd: number
	  }
	| { type: "volume"; volume: number; muted: boolean }
	| { type: "rate"; playbackRate: number }
	| { type: "live"; isLive: boolean }
	| {
			type: "tracks"
			textTracks: VideoTrack[]
			audioTracks: VideoTrack[]
			activeTextTrack: string | null
			activeAudioTrack: string | null
	  }
	| {
			type: "qualities"
			qualities: VideoQuality[]
			activeQuality: string | null
	  }
	| { type: "chapters"; chapters: VideoChapter[] }
	| { type: "capabilities"; capabilities: Partial<ProviderCapabilities> }
	| { type: "error"; error: VideoError }
	| { type: "extra"; name: string; detail?: unknown }

export interface AdapterMountOptions {
	source: ResolvedSource
	muted: boolean
	loop: boolean
	autoplay: boolean
	background: boolean
	controls: "none" | "provider"
	preload: "none" | "metadata" | "auto"
	startTime?: number
	endTime?: number
	/** From the code-only `captions` prop. */
	captionsDefault: "off" | "on"
	privacy: boolean
	tracks: VideoTrack[]
	chapters: VideoChapter[]
	mux?: MuxOptions
	/** Already resolved against canTrack and GPC by the controller. */
	muxData: boolean | MuxDataOptions
	label?: string
	/** location.hostname, for Twitch `parent` and YouTube `origin`. */
	hostname: string
	emit: (event: AdapterEvent) => void
	signal: AbortSignal
}

export interface ProviderAdapter {
	readonly element: HTMLElement
	readonly extras: ProviderExtras
	play: () => Promise<void>
	pause: () => void
	seek: (seconds: number) => void
	setMuted: (muted: boolean) => void
	setVolume?: (volume: number) => void
	setPlaybackRate?: (rate: number) => void
	setLoop?: (loop: boolean) => void
	setTextTrack?: (id: string | null) => void
	setAudioTrack?: (id: string) => void
	setQuality?: (id: string | null) => void
	setChapters?: (chapters: VideoChapter[]) => void
	requestPictureInPicture?: () => Promise<void>
	promptRemotePlayback?: () => Promise<void>
	destroy: () => void
}

export interface ProviderAdapterFactory {
	mount: (
		container: HTMLElement,
		options: AdapterMountOptions,
	) => ProviderAdapter
}

export interface ProviderDefinition {
	id: VideoProvider | (string & {})
	match: (input: string) => ParsedSource | null
	load: () => Promise<ProviderAdapterFactory>
	capabilities: ProviderCapabilities
	embedUrl?: (source: ParsedSource) => string
}

export interface VideoCallbacks {
	onVideoEvent?: (event: VideoEvent) => void
	onReady?: () => void
	onPlay?: () => void
	onPause?: () => void
	onEnded?: () => void
	onError?: (error: VideoError) => void
	onBlocked?: () => void
	onTimeUpdate?: (currentTime: number, duration: number) => void
}

export interface ControllerProps {
	play?: boolean
	muted?: boolean
	loop?: boolean
	startTime?: number
	endTime?: number
}

export interface ControllerOptions {
	provider: VideoProvider
	capabilities: ProviderCapabilities
	mode: VideoMode
	props: ControllerProps
}

export interface ControllerInternals extends VideoController {
	attach: (adapter: ProviderAdapter) => void
	detach: () => void
	handle: (event: AdapterEvent) => void
	setCallbacks: (callbacks: VideoCallbacks) => void
	setProps: (props: ControllerProps) => void
	playFromTrigger: () => void
	pauseFromTrigger: () => void
	claimTrigger: () => () => void
	/** True while custom trigger code holds a claim, so the built-in in-view trigger must stay idle. */
	readonly triggerClaimed: boolean
	destroy: () => void
}
