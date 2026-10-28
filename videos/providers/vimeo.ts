import type {
	AdapterEvent,
	AdapterMountOptions,
	ProviderAdapter,
	ProviderAdapterFactory,
	VideoChapter,
	VideoError,
	VideoTrack,
} from "library/videos/types"
import VimeoVideoElement from "vimeo-video-element"

const TIME_INTERVAL = 250

interface VimeoApi {
	getChapters: () => Promise<{ startTime: number; title: string }[]>
	on: (event: string, callback: () => void) => void
	off: (event: string, callback: () => void) => void
}

function apiOf(element: HTMLVideoElement): VimeoApi | null {
	const api: unknown = Reflect.get(element, "api")
	return api ? (api as VimeoApi) : null
}

function toError(element: HTMLVideoElement): VideoError {
	const raw: unknown = Reflect.get(element, "error")
	const name =
		typeof raw === "object" && raw !== null && "name" in raw
			? String(raw.name)
			: "Error"
	const message =
		typeof raw === "object" && raw !== null && "message" in raw
			? String(raw.message)
			: "Vimeo player error"
	const final = name === "PrivacyError" || name === "NotFoundError"
	return { code: name, message, retryable: !final, provider: "vimeo" }
}

function readTracks(element: HTMLVideoElement) {
	const list: TextTrackList | undefined = element.textTracks
	const textTracks: VideoTrack[] = []
	let activeTextTrack: string | null = null
	if (!list) return { textTracks, activeTextTrack }
	for (const track of Array.from(list)) {
		const id = `${track.language}:${track.kind}`
		textTracks.push({
			id,
			label: track.label || track.language,
			language: track.language,
			kind: track.kind === "captions" ? "captions" : "subtitles",
		})
		if (track.mode === "showing") activeTextTrack = id
	}
	return { textTracks, activeTextTrack }
}

function isCoarsePointer() {
	return globalThis.matchMedia("(pointer: coarse)").matches
}

function mount(
	container: HTMLElement,
	options: AdapterMountOptions,
): ProviderAdapter {
	const { source, signal } = options
	const id = source.provider === "vimeo" ? source.id : ""
	const hash = source.provider === "vimeo" ? source.hash : undefined
	const element = new VimeoVideoElement()
	const cleanups: (() => void)[] = []
	let destroyed = false
	let loop = options.loop
	let firstFrame = false
	let ready = false
	let lastTime = 0
	let defaultsApplied = false
	let playing = false
	let lastSeconds = 0
	let playWaiters: (() => void)[] = []

	const emit = (event: AdapterEvent) => {
		if (!destroyed) options.emit(event)
	}

	const listen = (target: EventTarget, type: string, handler: () => void) => {
		target.addEventListener(type, handler)
		cleanups.push(() => target.removeEventListener(type, handler))
	}

	const readTime = () => {
		const duration = Number.isFinite(element.duration) ? element.duration : 0
		const ranges = element.buffered
		const bufferedEnd = ranges.length > 0 ? ranges.end(ranges.length - 1) : 0
		return { currentTime: element.currentTime, duration, bufferedEnd }
	}

	/** Vimeo's `playing` event is not reliable in every embed (background mode, Safari), so playback is also inferred from `bufferend` and advancing time. */
	const markPlaying = () => {
		if (destroyed || playing) return
		playing = true
		if (!firstFrame) {
			firstFrame = true
			emit({ type: "firstFrame" })
		}
		emit({ type: "playing" })
		const waiters = playWaiters
		playWaiters = []
		for (const waiter of waiters) waiter()
	}

	const emitTime = () => {
		if (destroyed) return
		lastTime = Date.now()
		emit({ type: "time", ...readTime() })
	}

	const emitTracks = () => {
		if (destroyed) return
		const { textTracks, activeTextTrack } = readTracks(element)
		emit({
			type: "tracks",
			textTracks,
			audioTracks: [],
			activeTextTrack,
			activeAudioTrack: null,
		})
	}

	const applyCaptionDefault = () => {
		if (defaultsApplied || options.captionsDefault !== "on") return
		const list: TextTrackList | undefined = element.textTracks
		if (!list || list.length === 0) return
		const tracks = Array.from(list)
		const preferred = (globalThis.navigator.language || "en").slice(0, 2)
		const match =
			tracks.find((track) => track.language.startsWith(preferred)) ?? tracks[0]
		if (!match) return
		defaultsApplied = true
		match.mode = "showing"
	}

	const emitChapters = async () => {
		const provider = await apiOf(element)
			?.getChapters()
			.catch(() => [])
		const chapters: VideoChapter[] =
			provider && provider.length > 0
				? provider.map((chapter) => ({
						startTime: chapter.startTime,
						title: chapter.title,
					}))
				: options.chapters
		if (chapters.length > 0) emit({ type: "chapters", chapters })
	}

	listen(element, "loadcomplete", () => {
		if (ready) return
		ready = true
		if (options.startTime) element.currentTime = options.startTime
		if (isCoarsePointer()) {
			emit({ type: "capabilities", capabilities: { volume: "no" } })
		}
		emit({ type: "ready" })
		emit({ type: "volume", volume: element.volume, muted: element.muted })
		emit({ type: "rate", playbackRate: element.playbackRate })
		emitTime()
		void emitChapters()
		const api = apiOf(element)
		if (api) {
			const onBufferEnd = () => {
				if (!element.paused) markPlaying()
			}
			api.on("bufferend", onBufferEnd)
			cleanups.push(() => api.off("bufferend", onBufferEnd))
		}
		const list: TextTrackList | undefined = element.textTracks
		if (list) {
			const onTracks = () => {
				applyCaptionDefault()
				emitTracks()
			}
			listen(list, "addtrack", onTracks)
			listen(list, "change", emitTracks)
			onTracks()
		}
	})

	listen(element, "volumechange", () => {
		emit({ type: "volume", volume: element.volume, muted: element.muted })
	})

	listen(element, "ratechange", () => {
		emit({ type: "rate", playbackRate: element.playbackRate })
	})

	listen(element, "waiting", () => {
		playing = false
		emit({ type: "waiting" })
	})

	listen(element, "playing", markPlaying)

	listen(element, "pause", () => {
		playing = false
		emitTime()
		emit({ type: "paused" })
	})

	listen(element, "ended", () => {
		playing = false
		emitTime()
		if (loop) return
		emit({ type: "ended" })
	})

	listen(element, "durationchange", emitTime)

	listen(element, "timeupdate", () => {
		const { currentTime } = readTime()
		if (!playing && !element.paused && currentTime > lastSeconds) markPlaying()
		lastSeconds = currentTime
		if (options.endTime !== undefined && currentTime >= options.endTime) {
			if (loop) element.currentTime = options.startTime ?? 0
			else element.pause()
		}
		if (Date.now() - lastTime >= TIME_INTERVAL) emitTime()
	})

	listen(element, "error", () => {
		emit({ type: "error", error: toError(element) })
	})

	element.setAttribute("playsinline", "")
	element.setAttribute("preload", options.preload)
	if (options.controls === "provider") element.setAttribute("controls", "")
	if (options.autoplay) element.setAttribute("autoplay", "")
	if (options.muted) element.setAttribute("muted", "")
	if (loop) element.setAttribute("loop", "")
	element.config = {
		...(options.privacy ? { dnt: true } : {}),
		...(options.background ? { background: true } : {}),
	}
	const query = hash ? `?h=${hash}` : ""
	element.src = `https://vimeo.com/${id}${query}`
	container.append(element)

	queueMicrotask(() => {
		emit({ type: "loading" })
	})

	let notFoundTimer: ReturnType<typeof setTimeout> | undefined
	// The embedded player never reports a removed video (its page is a 404 with no messages), so ask oEmbed.
	const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}${query}`)}`
	if (!options.privacy) {
		fetch(oembedUrl, { signal })
			.then((response) => {
				if (destroyed || ready || response.status !== 404) return
				notFoundTimer = setTimeout(() => {
					if (destroyed || ready) return
					emit({
						type: "error",
						error: {
							code: "NotFoundError",
							message: "This Vimeo video was not found",
							retryable: false,
							provider: "vimeo",
						},
					})
				}, NOT_FOUND_GRACE_MS)
			})
			.catch(() => undefined)
	}

	const destroy = () => {
		if (destroyed) return
		destroyed = true
		clearTimeout(notFoundTimer)
		playWaiters = []
		for (const cleanup of cleanups) cleanup()
		cleanups.length = 0
		element.remove()
		signal.removeEventListener("abort", destroy)
	}

	if (signal.aborted) destroy()
	else signal.addEventListener("abort", destroy, { once: true })

	return {
		element,
		extras: {
			vimeo: {
				getChapters: async () => {
					const chapters = (await apiOf(element)?.getChapters()) ?? []
					return chapters.map((chapter) => ({
						startTime: chapter.startTime,
						title: chapter.title,
					}))
				},
			},
		},
		play: async () => {
			if (destroyed) throw new DOMException("Destroyed", "AbortError")
			const started = new Promise<void>((resolve) => {
				playWaiters.push(resolve)
			})
			// Background embeds may never settle player.play(), so the first playing signal also ends the wait.
			const settled = element.play().then(
				() => undefined,
				(error: unknown) => {
					const name =
						typeof error === "object" && error !== null && "name" in error
							? error.name
							: ""
					if (name === "AbortError") return
					if (name === "NotAllowedError") emit({ type: "blocked" })
					throw error
				},
			)
			await Promise.race([settled, started])
			settled.catch(() => undefined)
		},
		pause: () => {
			if (destroyed) return
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
				track.mode =
					`${track.language}:${track.kind}` === trackId ? "showing" : "disabled"
			}
		},
		requestPictureInPicture: async () => {
			await element.requestPictureInPicture()
		},
		destroy,
	}
}

const NOT_FOUND_GRACE_MS = 4000

export const factory: ProviderAdapterFactory = { mount }
