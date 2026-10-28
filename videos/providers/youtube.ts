import type {
	AdapterEvent,
	AdapterMountOptions,
	ProviderAdapter,
	ProviderAdapterFactory,
	VideoError,
	VideoTrack,
} from "library/videos/types"
import YoutubeVideoElement from "youtube-video-element"

const TIME_INTERVAL = 250
const STATE_ENDED = 0
const STATE_BUFFERING = 3

interface YouTubeApi {
	getPlayerState: () => number
	getAvailablePlaybackRates: () => number[]
	addEventListener: (
		event: string,
		listener: (event: { data?: unknown }) => void,
	) => void
	destroy: () => void
}

function apiOf(element: HTMLVideoElement): YouTubeApi | null {
	const api: unknown = Reflect.get(element, "api")
	return api ? (api as YouTubeApi) : null
}

function detachApi(element: HTMLVideoElement) {
	const api = apiOf(element)
	Reflect.set(element, "api", null)
	if (!api) return
	try {
		api.destroy()
	} catch {
		return
	}
}

function toError(element: HTMLVideoElement): VideoError {
	const raw: unknown = Reflect.get(element, "error")
	const code =
		typeof raw === "object" && raw !== null && "code" in raw
			? raw.code
			: undefined
	const message =
		typeof raw === "object" && raw !== null && "message" in raw
			? String(raw.message)
			: "YouTube player error"
	return {
		code:
			typeof code === "number" || typeof code === "string" ? code : "unknown",
		message,
		retryable: code === 5,
		provider: "youtube",
	}
}

function readTracks(element: HTMLVideoElement) {
	const list: TextTrackList | undefined = element.textTracks
	const textTracks: VideoTrack[] = []
	let activeTextTrack: string | null = null
	if (!list) return { textTracks, activeTextTrack }
	for (const track of Array.from(list)) {
		const id = track.language
		textTracks.push({
			id,
			label: track.label || track.language,
			language: track.language,
			kind: "subtitles",
		})
		if (track.mode === "showing") activeTextTrack = id
	}
	return { textTracks, activeTextTrack }
}

function buildSrc(id: string, privacy: boolean) {
	const base = privacy
		? "https://www.youtube-nocookie.com/embed"
		: "https://www.youtube.com/embed"
	return `${base}/${id}`
}

function buildOrigin(hostname: string) {
	const location = globalThis.location
	return hostname === location.hostname
		? location.origin
		: `https://${hostname}`
}

function mount(
	container: HTMLElement,
	options: AdapterMountOptions,
): ProviderAdapter {
	const { source, signal } = options
	const id = source.provider === "youtube" ? source.id : ""
	const element = new YoutubeVideoElement()
	const cleanups: (() => void)[] = []
	const waiters = new Set<{
		resolve: () => void
		reject: (reason: unknown) => void
	}>()
	let destroyed = false
	let loop = options.loop
	let firstFrame = false
	let ready = false
	let timer: ReturnType<typeof setInterval> | undefined
	let trackCount = 0

	const emit = (event: AdapterEvent) => {
		if (!destroyed) options.emit(event)
	}

	const listen = (type: string, handler: () => void) => {
		element.addEventListener(type, handler)
		cleanups.push(() => element.removeEventListener(type, handler))
	}

	const readTime = () => {
		const duration = Number.isFinite(element.duration) ? element.duration : 0
		const ranges = element.buffered
		const bufferedEnd = ranges.length > 0 ? ranges.end(ranges.length - 1) : 0
		return { currentTime: element.currentTime, duration, bufferedEnd }
	}

	const emitTime = () => {
		emit({ type: "time", ...readTime() })
	}

	const emitTracks = () => {
		const { textTracks, activeTextTrack } = readTracks(element)
		trackCount = textTracks.length
		emit({
			type: "tracks",
			textTracks,
			audioTracks: [],
			activeTextTrack,
			activeAudioTrack: null,
		})
	}

	const stopTimer = () => {
		if (timer === undefined) return
		clearInterval(timer)
		timer = undefined
	}

	const tick = () => {
		const { currentTime } = readTime()
		emitTime()
		if (options.endTime === undefined || currentTime < options.endTime) return
		if (loop) element.currentTime = options.startTime ?? 0
		else element.pause()
	}

	const startTimer = () => {
		if (timer !== undefined) return
		timer = setInterval(tick, TIME_INTERVAL)
	}

	const settle = (error?: unknown) => {
		for (const waiter of waiters) {
			if (error === undefined) waiter.resolve()
			else waiter.reject(error)
		}
		waiters.clear()
	}

	const block = () => {
		emit({ type: "blocked" })
		settle(new DOMException("Autoplay was blocked", "NotAllowedError"))
	}

	listen("loadedmetadata", () => {
		if (ready) return
		ready = true
		const api = apiOf(element)
		api?.addEventListener("onAutoplayBlocked", block)
		api?.addEventListener("onStateChange", (event) => {
			if (event.data === STATE_BUFFERING) emit({ type: "waiting" })
		})
		if (options.muted) element.muted = true
		emit({ type: "ready" })
		emit({ type: "volume", volume: element.volume, muted: element.muted })
		emit({ type: "rate", playbackRate: element.playbackRate })
		emitTime()
	})

	listen("volumechange", () => {
		emit({ type: "volume", volume: element.volume, muted: element.muted })
	})

	listen("ratechange", () => {
		emit({ type: "rate", playbackRate: element.playbackRate })
	})

	listen("playing", () => {
		if (!firstFrame) {
			firstFrame = true
			emit({ type: "firstFrame" })
		}
		emit({ type: "playing" })
		startTimer()
		settle()
		if (readTracks(element).textTracks.length !== trackCount) emitTracks()
	})

	listen("pause", () => {
		stopTimer()
		if (apiOf(element)?.getPlayerState() === STATE_ENDED) return
		emitTime()
		emit({ type: "paused" })
	})

	listen("ended", () => {
		stopTimer()
		emitTime()
		if (loop) {
			if (options.startTime) element.currentTime = options.startTime
			return
		}
		emit({ type: "ended" })
	})

	listen("error", () => {
		const error = toError(element)
		emit({ type: "error", error })
		settle(new Error(error.message))
	})

	element.setAttribute("playsinline", "")
	element.setAttribute("preload", options.preload)
	if (options.controls === "provider") element.setAttribute("controls", "")
	if (options.autoplay) element.setAttribute("autoplay", "")
	if (options.muted) element.setAttribute("muted", "")
	if (loop) element.setAttribute("loop", "")
	element.config = {
		origin: buildOrigin(options.hostname),
		...(options.captionsDefault === "on" ? { cc_load_policy: 1 as const } : {}),
		...(options.controls === "none"
			? { disablekb: 1 as const, fs: 0 as const }
			: {}),
		...(options.startTime ? { start: Math.floor(options.startTime) } : {}),
		...(options.endTime !== undefined && !loop
			? { end: Math.ceil(options.endTime) }
			: {}),
	}
	element.src = buildSrc(id, options.privacy)
	container.append(element)

	queueMicrotask(() => {
		emit({ type: "loading" })
	})

	const destroy = () => {
		if (destroyed) return
		destroyed = true
		stopTimer()
		for (const cleanup of cleanups) cleanup()
		cleanups.length = 0
		settle(new DOMException("Destroyed", "AbortError"))
		detachApi(element)
		element.remove()
		signal.removeEventListener("abort", destroy)
	}

	if (signal.aborted) destroy()
	else signal.addEventListener("abort", destroy, { once: true })

	return {
		element,
		extras: {
			youtube: {
				getAvailablePlaybackRates: () =>
					apiOf(element)?.getAvailablePlaybackRates() ?? [1],
			},
		},
		play: () =>
			new Promise<void>((resolve, reject) => {
				if (destroyed) {
					reject(new DOMException("Destroyed", "AbortError"))
					return
				}
				if (ready && !element.paused) {
					resolve()
					return
				}
				const waiter = { resolve, reject }
				waiters.add(waiter)
				element.play().catch((error: unknown) => {
					waiters.delete(waiter)
					reject(error)
				})
			}),
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
		setPlaybackRate: (rate) => {
			element.playbackRate = rate
		},
		setLoop: (value) => {
			loop = value
			element.loop = value
		},
		setTextTrack: (trackId) => {
			const list: TextTrackList | undefined = element.textTracks
			if (!list) return
			for (const track of Array.from(list)) {
				track.mode = track.language === trackId ? "showing" : "disabled"
			}
			queueMicrotask(emitTracks)
		},
		destroy,
	}
}

export const factory: ProviderAdapterFactory = { mount }
