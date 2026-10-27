import WistiaVideoElement from "wistia-video-element"
import type {
	AdapterEvent,
	AdapterMountOptions,
	ProviderAdapter,
	ProviderAdapterFactory,
	VideoError,
} from "library/videos/types"

const TIME_INTERVAL = 250
const READY_TIMEOUT = 15000
const ELEMENT_SRC = /(?:wistia\.com|wi\.st)\/(?:medias|embed)\/(.*)$/i
const WISTIA_ID = /^[a-z0-9]{10}$/i

interface WistiaApi {
	endVideoBehavior: (value: "loop" | "default") => void
	remove: () => void
}

function apiOf(element: HTMLVideoElement): WistiaApi | null {
	const api: unknown = Reflect.get(element, "api")
	return api ? (api as WistiaApi) : null
}

function whenLoaded(element: HTMLVideoElement, done: () => void) {
	const promise: unknown = Reflect.get(element, "loadComplete")
	if (promise instanceof Promise) void promise.then(done, () => undefined)
}

function validSrc(id: string) {
	if (!WISTIA_ID.test(id)) return null
	const src = `https://fast.wistia.com/medias/${id}`
	return ELEMENT_SRC.exec(src)?.[1] === id ? src : null
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
			: "Wistia player error"
	return {
		code: typeof code === "number" || typeof code === "string" ? code : "unknown",
		message,
		retryable: code === 2,
		provider: "wistia",
	}
}

function invalidAdapter(
	container: HTMLElement,
	options: AdapterMountOptions,
): ProviderAdapter {
	const placeholder = document.createElement("div")
	placeholder.hidden = true
	container.append(placeholder)
	queueMicrotask(() => {
		if (options.signal.aborted) return
		options.emit({
			type: "error",
			error: {
				code: "invalid-source",
				message: "The Wistia media id or URL is not valid.",
				retryable: false,
				provider: "wistia",
			},
		})
	})
	return {
		element: placeholder,
		extras: {},
		play: () => Promise.reject(new Error("Invalid Wistia source")),
		pause: () => undefined,
		seek: () => undefined,
		setMuted: () => undefined,
		destroy: () => {
			placeholder.remove()
		},
	}
}

function mount(
	container: HTMLElement,
	options: AdapterMountOptions,
): ProviderAdapter {
	const { source, signal } = options
	const src = source.provider === "wistia" ? validSrc(source.id) : null
	if (!src) return invalidAdapter(container, options)

	const element = new WistiaVideoElement()
	const cleanups: (() => void)[] = []
	const waiters = new Set<{
		resolve: () => void
		reject: (reason: unknown) => void
	}>()
	let destroyed = false
	let loop = options.loop
	let firstFrame = false
	let ready = false
	let lastTime = 0
	let readyTimer: ReturnType<typeof setTimeout> | undefined

	const emit = (event: AdapterEvent) => {
		if (!destroyed) options.emit(event)
	}

	const listen = (type: string, handler: () => void) => {
		element.addEventListener(type, handler)
		cleanups.push(() => element.removeEventListener(type, handler))
	}

	const readTime = () => {
		const raw: unknown = element.duration
		const duration = typeof raw === "number" && Number.isFinite(raw) ? raw : 0
		const ranges = element.buffered
		const bufferedEnd = ranges.length > 0 ? ranges.end(ranges.length - 1) : 0
		return { currentTime: element.currentTime, duration, bufferedEnd }
	}

	const emitTime = () => {
		lastTime = Date.now()
		emit({ type: "time", ...readTime() })
	}

	const settle = (error?: unknown) => {
		for (const waiter of waiters) {
			if (error === undefined) waiter.resolve()
			else waiter.reject(error)
		}
		waiters.clear()
	}

	listen("playing", () => {
		if (!firstFrame) {
			firstFrame = true
			emit({ type: "firstFrame" })
		}
		emit({ type: "playing" })
		settle()
	})

	listen("pause", () => {
		emitTime()
		emit({ type: "paused" })
	})

	listen("waiting", () => {
		emit({ type: "waiting" })
	})

	listen("ended", () => {
		emitTime()
		if (loop) return
		emit({ type: "ended" })
	})

	listen("volumechange", () => {
		emit({ type: "volume", volume: element.volume, muted: element.muted })
	})

	listen("ratechange", () => {
		emit({ type: "rate", playbackRate: element.playbackRate })
	})

	listen("durationchange", emitTime)

	listen("timeupdate", () => {
		const { currentTime } = readTime()
		if (options.endTime !== undefined && currentTime >= options.endTime) {
			if (loop) element.currentTime = options.startTime ?? 0
			else  element.pause()
		}
		if (Date.now() - lastTime >= TIME_INTERVAL) emitTime()
	})

	listen("error", () => {
		const error = toError(element)
		emit({ type: "error", error })
		settle(new Error(error.message))
	})

	whenLoaded(element, () => {
		if (destroyed || ready) return
		ready = true
		clearTimeout(readyTimer)
		if (options.startTime !== undefined && options.startTime > 0)
			element.currentTime = options.startTime
		emit({ type: "ready" })
		emit({ type: "volume", volume: element.volume, muted: element.muted })
		emit({ type: "rate", playbackRate: element.playbackRate })
		emitTime()
	})

	readyTimer = setTimeout(() => {
		if (ready) return
		emit({
			type: "error",
			error: {
				code: "timeout",
				message: "The Wistia player did not load.",
				retryable: true,
				provider: "wistia",
			},
		})
	}, READY_TIMEOUT)

	element.setAttribute("playsinline", "")
	element.setAttribute("preload", options.preload)
	if (options.controls === "provider") element.setAttribute("controls", "")
	if (options.autoplay) element.setAttribute("autoplay", "")
	if (options.muted) element.setAttribute("muted", "")
	if (loop) element.setAttribute("loop", "")
	element.config = {
		videoFoam: false,
		fitStrategy: "cover",
		...(options.privacy ? { doNotTrack: true } : {}),
		...(options.captionsDefault === "on"
			? { plugin: { "captions-v1": { onByDefault: true } } }
			: {}),
	}
	element.src = src
	container.append(element)

	queueMicrotask(() => {
		emit({ type: "loading" })
	})

	const destroy = () => {
		if (destroyed) return
		destroyed = true
		clearTimeout(readyTimer)
		for (const cleanup of cleanups) cleanup()
		cleanups.length = 0
		settle(new DOMException("Destroyed", "AbortError"))
		const api = apiOf(element)
		if (api) {
			try {
				api.remove()
			} catch {
				Reflect.set(element, "api", null)
			}
		}
		element.remove()
		signal.removeEventListener("abort", destroy)
	}

	if (signal.aborted) destroy()
	else signal.addEventListener("abort", destroy, { once: true })

	return {
		element,
		extras: {},
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
				waiters.add({ resolve, reject })
				void element.play()
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
			apiOf(element)?.endVideoBehavior(value ? "loop" : "default")
		},
		destroy,
	}
}

export const factory: ProviderAdapterFactory = { mount }
