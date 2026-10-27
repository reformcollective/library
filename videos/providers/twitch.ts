import "twitch-video-element"
import { debugCounters } from "library/videos/trigger/concurrency"
import type {
	AdapterEvent,
	AdapterMountOptions,
	ProviderAdapter,
	ProviderAdapterFactory,
	ProviderCapabilities,
	TwitchExtras,
	VideoQuality,
	VideoTrack,
} from "library/videos/types"

const TIME_INTERVAL_MS = 250
const EMBED_ORIGIN = "https://player.twitch.tv"
const NAMESPACE_PROXY = "twitch-embed-player-proxy"
const NAMESPACE_EVENTS = "twitch-embed"
const COMMAND = {
	disableCaptions: 0,
	enableCaptions: 1,
	setChannel: 5,
	setCollection: 7,
	setQuality: 8,
	setVideo: 9,
} as const
const CAPTIONS_TRACK: VideoTrack = {
	id: "captions",
	label: "Captions",
	kind: "captions",
}
const IFRAME_ONLY_CAPABILITIES: Partial<ProviderCapabilities> = {
	play: "no",
	seek: "no",
	muted: "no",
	volume: "no",
	timeRead: "no",
	ended: "no",
	error: "no",
	captions: "no",
	qualitySelect: "no",
	live: "no",
}
const LIVE_CAPABILITIES: Partial<ProviderCapabilities> = {
	seek: "no",
}

interface TwitchElement extends HTMLElement {
	config: Record<string, string | number | boolean> | null
	currentTime: number
	volume: number
	muted: boolean
	readonly duration: number
	readonly buffered: TimeRanges
	readonly paused: boolean
	readonly ended: boolean
	play: () => void
	pause: () => void
}

interface QualityEntry {
	id: string
	label: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function toQualityEntry(value: unknown): QualityEntry | null {
	if (typeof value === "string") return { id: value, label: value }
	if (!isRecord(value)) return null
	const name = typeof value.name === "string" ? value.name : undefined
	const group = typeof value.group === "string" ? value.group : undefined
	const id = group ?? name
	if (!id) return null
	return { id, label: name ?? id }
}

function toVideoQuality(entry: QualityEntry): VideoQuality {
	const height = /(\d+)p/.exec(entry.label)
	const label = entry.id === "chunked" ? "Source" : entry.label
	return height?.[1]
		? { id: entry.id, label, height: Number(height[1]) }
		: { id: entry.id, label }
}

function createTwitchUrl(
	kind: "video" | "channel",
	id: string,
) {
	if (kind === "video") return `https://www.twitch.tv/videos/${id}`
	return `https://www.twitch.tv/${id}`
}

function mountIframe(
	container: HTMLElement,
	options: AdapterMountOptions,
	url: string,
): ProviderAdapter {
	const iframe = document.createElement("iframe")
	let destroyed = false
	const emit = (event: AdapterEvent) => {
		if (!destroyed) options.emit(event)
	}
	iframe.src = url
	iframe.width = "100%"
	iframe.height = "100%"
	iframe.title = options.label ?? "Twitch"
	iframe.allow = "autoplay; fullscreen"
	iframe.allowFullscreen = true
	iframe.setAttribute("frameborder", "0")
	iframe.setAttribute("scrolling", "no")
	iframe.setAttribute(
		"sandbox",
		"allow-modals allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox",
	)
	const onLoad = () => {
		emit({ type: "capabilities", capabilities: IFRAME_ONLY_CAPABILITIES })
		emit({ type: "ready" })
		emit({ type: "firstFrame" })
	}
	iframe.addEventListener("load", onLoad)
	container.append(iframe)
	debugCounters.elements += 1
	return {
		element: iframe,
		extras: {},
		play: async () => {},
		pause: () => {},
		seek: () => {},
		setMuted: () => {},
		destroy: () => {
			if (destroyed) return
			destroyed = true
			iframe.removeEventListener("load", onLoad)
			iframe.remove()
			debugCounters.elements -= 1
		},
	}
}

function mountElement(
	container: HTMLElement,
	options: AdapterMountOptions,
	kind: "video" | "channel",
	id: string,
): ProviderAdapter {
	const element = document.createElement("twitch-video") as TwitchElement
	let destroyed = false
	let lastTime = 0
	let firstFrameSent = false
	let qualityKey = ""
	let qualities: QualityEntry[] = []
	let stats: Record<string, unknown> = {}
	let captionsOn = false

	const emit = (event: AdapterEvent) => {
		if (!destroyed) options.emit(event)
	}
	const getIframe = () => element.shadowRoot?.querySelector("iframe") ?? null
	const send = (command: number, params: unknown) => {
		getIframe()?.contentWindow?.postMessage(
			{ eventName: command, params, namespace: NAMESPACE_PROXY },
			EMBED_ORIGIN,
		)
	}

	const config: Record<string, string | number | boolean> = {
		muted: options.muted,
	}
	if (kind === "video" && options.startTime !== undefined && options.startTime > 0)
		config.time = Math.floor(options.startTime)
	element.config = config
	element.setAttribute("parent", options.hostname)
	if (options.muted) element.setAttribute("muted", "")
	if (options.autoplay) element.setAttribute("autoplay", "")
	if (options.controls === "provider") element.setAttribute("controls", "")
	element.setAttribute("preload", options.preload)
	element.setAttribute("playsinline", "")
	if (options.label) element.setAttribute("aria-label", options.label)
	else if (options.background) element.setAttribute("aria-hidden", "true")
	element.setAttribute("src", createTwitchUrl(kind, id))
	container.append(element)
	debugCounters.elements += 1

	const readBufferedEnd = () => {
		const { buffered } = element
		const ahead = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0
		return element.currentTime + ahead
	}
	const emitTime = () => {
		lastTime = performance.now()
		emit({
			type: "time",
			currentTime: element.currentTime,
			duration: element.duration,
			bufferedEnd: readBufferedEnd(),
		})
	}
	const emitCaptionTracks = () => {
		emit({
			type: "tracks",
			textTracks: [CAPTIONS_TRACK],
			audioTracks: [],
			activeTextTrack: captionsOn ? CAPTIONS_TRACK.id : null,
			activeAudioTrack: null,
		})
	}

	const onLoadedMetadata = () => {
		emit({ type: "ready" })
		if (kind === "channel") {
			emit({ type: "live", isLive: true })
			emit({ type: "capabilities", capabilities: LIVE_CAPABILITIES })
		}
		emitCaptionTracks()
		emitTime()
	}
	const onPlaying = () => {
		emit({ type: "playing" })
		if (firstFrameSent) return
		firstFrameSent = true
		emit({ type: "firstFrame" })
	}
	const onPause = () => {
		if (!element.ended) emit({ type: "paused" })
	}
	const onEnded = () => {
		emitTime()
		emit({ type: "ended" })
	}
	const onTimeUpdate = () => {
		if (performance.now() - lastTime >= TIME_INTERVAL_MS) emitTime()
	}
	const onVolume = () => {
		emit({ type: "volume", volume: element.volume, muted: element.muted })
	}
	const listeners: [string, () => void][] = [
		["loadstart", () => emit({ type: "loading" })],
		["loadedmetadata", onLoadedMetadata],
		["durationchange", emitTime],
		["timeupdate", onTimeUpdate],
		["progress", emitTime],
		["playing", onPlaying],
		["pause", onPause],
		["ended", onEnded],
		["volumechange", onVolume],
	]
	for (const [type, listener] of listeners)
		element.addEventListener(type, listener)

	const applyState = (params: Record<string, unknown>) => {
		const available = Array.isArray(params.qualitiesAvailable)
			? params.qualitiesAvailable
			: undefined
		if (available) {
			qualities = available
				.map(toQualityEntry)
				.filter((entry): entry is QualityEntry => entry !== null)
		}
		const active = toQualityEntry(params.quality)
		if (isRecord(params.stats) && isRecord(params.stats.videoStats))
			stats = params.stats.videoStats
		const key = `${qualities.map((entry) => entry.id).join(",")}|${active?.id ?? ""}`
		if (key === qualityKey) return
		qualityKey = key
		emit({
			type: "qualities",
			qualities: qualities.map(toVideoQuality),
			activeQuality: active?.id ?? null,
		})
	}

	const onEmbedEvent = (name: unknown, params: unknown) => {
		if (name === "playbackBlocked") emit({ type: "blocked" })
		else if (name === "offline") {
			emit({ type: "extra", name: "offline" })
			emit({ type: "live", isLive: false })
		} else if (name === "online") {
			emit({ type: "extra", name: "online" })
			emit({ type: "live", isLive: true })
		} else if (name === "captions")
			emit({ type: "extra", name: "captions", detail: params })
		else if (name === "error") {
			const code =
				isRecord(params) && (typeof params.code === "number" || typeof params.code === "string")
					? params.code
					: "twitch_error"
			const message =
				isRecord(params) && typeof params.message === "string"
					? params.message
					: "Twitch player error"
			emit({
				type: "error",
				error: { code, message, retryable: false, provider: "twitch" },
			})
		}
	}

	const onMessage = (event: MessageEvent) => {
		if (destroyed) return
		const frame = getIframe()
		if (!frame || event.source !== frame.contentWindow) return
		const data: unknown = event.data
		if (!isRecord(data)) return
		if (data.namespace === NAMESPACE_PROXY) {
			if (data.eventName === "UPDATE_STATE" && isRecord(data.params))
				applyState(data.params)
		} else if (data.namespace === NAMESPACE_EVENTS) {
			onEmbedEvent(data.eventName, data.params)
		}
	}
	window.addEventListener("message", onMessage)

	const extras: TwitchExtras = {
		getQualities: () => qualities.map((entry) => entry.id),
		getPlaybackStats: () => stats,
		setChannel: (channel) => {
			send(COMMAND.setChannel, channel)
			emit({ type: "live", isLive: true })
		},
		setVideo: (videoId, time) => {
			const prefixed = videoId.startsWith("v") ? videoId : `v${videoId}`
			send(COMMAND.setVideo, time === undefined ? prefixed : [prefixed, time])
			emit({ type: "live", isLive: false })
		},
		setCollection: (collectionId, videoId) => {
			send(COMMAND.setCollection, [collectionId, videoId])
			emit({ type: "live", isLive: false })
		},
	}

	return {
		element,
		extras: { twitch: extras },
		play: async () => {
			element.play()
		},
		pause: () => {
			element.pause()
		},
		seek: (seconds) => {
			element.currentTime = seconds
		},
		setMuted: (muted) => {
			element.muted = muted
		},
		setVolume: (volume) => {
			element.volume = volume
		},
		setQuality: (qualityId) => {
			send(COMMAND.setQuality, qualityId ?? "auto")
		},
		setTextTrack: (trackId) => {
			captionsOn = trackId !== null
			send(captionsOn ? COMMAND.enableCaptions : COMMAND.disableCaptions, null)
			emitCaptionTracks()
		},
		destroy: () => {
			if (destroyed) return
			destroyed = true
			window.removeEventListener("message", onMessage)
			for (const [type, listener] of listeners)
				element.removeEventListener(type, listener)
			element.removeAttribute("src")
			element.remove()
			debugCounters.elements -= 1
		},
	}
}

export const factory: ProviderAdapterFactory = {
	mount: (container, options) => {
		const { source } = options
		if (source.provider !== "twitch")
			throw new Error("The Twitch adapter needs a Twitch source")
		const kind = source.kind ?? "video"
		const parent = `parent=${encodeURIComponent(options.hostname)}`
		const flags = `autoplay=${options.autoplay}&muted=${options.muted}`
		if (kind === "clip") {
			const url = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(source.id)}&${parent}&${flags}`
			return mountIframe(container, options, url)
		}
		if (kind === "collection") {
			const url = `${EMBED_ORIGIN}/?collection=${encodeURIComponent(source.id)}&${parent}&${flags}`
			return mountIframe(container, options, url)
		}
		return mountElement(container, options, kind, source.id)
	},
}
