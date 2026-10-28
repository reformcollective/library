import { debugCounters } from "library/videos/trigger/concurrency"
import type {
	AdapterEvent,
	AdapterMountOptions,
	ProviderAdapter,
	ProviderExtras,
	VideoChapter,
	VideoError,
	VideoProvider,
	VideoTrack,
} from "library/videos/types"

const TIME_INTERVAL_MS = 250

interface FrameCallbackElement {
	requestVideoFrameCallback?: (callback: () => void) => number
	cancelVideoFrameCallback?: (handle: number) => void
}

interface AudioTrackLike {
	id: string
	label: string
	language: string
	enabled: boolean
}

interface AudioTrackListLike {
	length: number
	[index: number]: AudioTrackLike | undefined
	addEventListener: (type: string, listener: (event: Event) => void) => void
	removeEventListener: (type: string, listener: (event: Event) => void) => void
}

interface ElementWithAudio {
	audioTracks?: AudioTrackListLike
	remote?: { prompt: () => Promise<void> }
	addChapters?: (chapters: { startTime: number; value: string }[]) => void
}

export interface MediaAdapterConfig {
	element: HTMLVideoElement
	provider: VideoProvider
	options: AdapterMountOptions
	extras?: ProviderExtras
	/** Called once, after common attributes are set and before the adapter starts listening. Assign `src` here. */
	assignSource: (element: HTMLVideoElement) => void
	/** True when the element supports `addChapters` (mux-video). */
	chapterApi?: boolean
	/** Replaces the default teardown (`src` removal plus `load()`) for elements that manage their own source, such as mux-video. */
	teardown?: (element: HTMLVideoElement) => void
}

function trackId(track: TextTrack, index: number) {
	return track.id || String(index)
}

function toVideoError(
	element: HTMLVideoElement,
	provider: VideoProvider,
): VideoError {
	const error = element.error
	const code = error ? error.code : 0
	const message = error && error.message ? error.message : "Media error"
	return { code, message, retryable: code !== 1 && code !== 4, provider }
}

function readBufferedEnd(element: HTMLVideoElement) {
	const { buffered } = element
	if (buffered.length === 0) return 0
	return buffered.end(buffered.length - 1)
}

/** Shared adapter for native <video>, hls-video and mux-video, which all expose the HTMLMediaElement API. */
export function createMediaElementAdapter(
	container: HTMLElement,
	config: MediaAdapterConfig,
): ProviderAdapter {
	const { element, provider, options } = config
	const emit = (event: AdapterEvent) => {
		if (!destroyed) options.emit(event)
	}
	let destroyed = false
	let lastTime = 0
	let frameHandle: number | undefined
	let playFrameHandle: number | undefined
	let firstFrameSent = false
	const frameElement: FrameCallbackElement = element
	let chaptersList: VideoChapter[] = options.chapters
	let chaptersPending = false

	element.setAttribute("playsinline", "")
	element.playsInline = true
	if (options.muted) element.setAttribute("muted", "")
	element.defaultMuted = options.muted
	element.muted = options.muted
	element.loop = options.loop
	element.preload = options.preload
	if (options.background) {
		element.disableRemotePlayback = true
		element.setAttribute("x-webkit-airplay", "deny")
	}
	element.controls = options.controls === "provider"
	if (options.label) element.setAttribute("aria-label", options.label)
	else if (options.background) element.setAttribute("aria-hidden", "true")
	config.assignSource(element)
	container.append(element)
	debugCounters.elements += 1

	const emitTime = () => {
		lastTime = performance.now()
		emit({
			type: "time",
			currentTime: element.currentTime,
			duration: element.duration,
			bufferedEnd: readBufferedEnd(element),
		})
	}

	const emitFirstFrame = () => {
		if (firstFrameSent) return
		firstFrameSent = true
		emit({ type: "firstFrame" })
	}

	const emitTracks = () => {
		if (destroyed) return
		const text: VideoTrack[] = []
		let activeText: string | null = null
		for (let i = 0; i < element.textTracks.length; i++) {
			const track = element.textTracks[i]
			if (!track) continue
			if (track.kind !== "captions" && track.kind !== "subtitles") continue
			const id = trackId(track, i)
			text.push({
				id,
				label: track.label || track.language || id,
				language: track.language || undefined,
				kind: track.kind,
			})
			if (track.mode !== "disabled") activeText = id
		}
		const audio: VideoTrack[] = []
		let activeAudio: string | null = null
		const audioList = (element as ElementWithAudio).audioTracks
		if (audioList) {
			for (let i = 0; i < audioList.length; i++) {
				const track = audioList[i]
				if (!track) continue
				const id = track.id || String(i)
				audio.push({
					id,
					label: track.label || track.language || id,
					language: track.language || undefined,
					kind: "audio",
				})
				if (track.enabled) activeAudio = id
			}
		}
		emit({
			type: "tracks",
			textTracks: text,
			audioTracks: audio,
			activeTextTrack: activeText,
			activeAudioTrack: activeAudio,
		})
	}

	let captionsApplied = options.captionsDefault !== "on"
	const applyCaptionsDefault = () => {
		if (captionsApplied) return
		for (let i = 0; i < element.textTracks.length; i++) {
			const track = element.textTracks[i]
			if (!track) continue
			if (track.kind !== "captions" && track.kind !== "subtitles") continue
			captionsApplied = true
			track.mode = "hidden"
			return
		}
	}
	const onTracksChanged = () => {
		applyCaptionsDefault()
		emitTracks()
	}

	const flushChapters = () => {
		if (!chaptersPending || !element.currentSrc) return
		chaptersPending = false
		;(element as ElementWithAudio).addChapters?.(
			chaptersList.map((chapter) => ({
				startTime: chapter.startTime,
				value: chapter.title,
			})),
		)
	}

	const onLoadedMetadata = () => {
		flushChapters()
		if (options.startTime !== undefined && options.startTime > 0)
			element.currentTime = options.startTime
		emitTime()
		onTracksChanged()
	}
	const onTimeUpdate = () => {
		if (performance.now() - lastTime >= TIME_INTERVAL_MS) emitTime()
	}
	const onPlaying = () => {
		isWaiting = false
		emit({ type: "playing" })
		emitFirstFrame()
		// A second firstFrame once a frame is painted while playing lets the poster stay until the video is really visible.
		if (frameElement.requestVideoFrameCallback) {
			if (playFrameHandle !== undefined)
				frameElement.cancelVideoFrameCallback?.(playFrameHandle)
			playFrameHandle = frameElement.requestVideoFrameCallback(() =>
				emit({ type: "firstFrame" }),
			)
		} else emit({ type: "firstFrame" })
	}
	const onPause = () => {
		if (!element.ended) emit({ type: "paused" })
	}
	const onEnded = () => {
		emitTime()
		emit({ type: "ended" })
	}
	const onVolume = () => {
		emit({ type: "volume", volume: element.volume, muted: element.muted })
	}
	const onRate = () => {
		emit({ type: "rate", playbackRate: element.playbackRate })
	}
	const onError = () => {
		emit({ type: "error", error: toVideoError(element, provider) })
	}
	const onLoadStart = () => {
		emit({ type: "loading" })
		flushChapters()
	}
	let isWaiting = false
	const onWaiting = () => {
		isWaiting = true
		emit({ type: "waiting" })
	}
	const onCanPlay = () => {
		if (!isWaiting) return
		isWaiting = false
		emit({ type: element.paused ? "paused" : "playing" })
	}
	const onLoadedData = () => emitFirstFrame()

	const listeners: [string, () => void][] = [
		["loadstart", onLoadStart],
		["loadedmetadata", onLoadedMetadata],
		["durationchange", emitTime],
		["timeupdate", onTimeUpdate],
		["progress", emitTime],
		["playing", onPlaying],
		["pause", onPause],
		["waiting", onWaiting],
		["canplay", onCanPlay],
		["loadeddata", onLoadedData],
		["ended", onEnded],
		["volumechange", onVolume],
		["ratechange", onRate],
		["error", onError],
	]
	for (const [type, listener] of listeners)
		element.addEventListener(type, listener)

	const textTracks = element.textTracks
	textTracks.addEventListener("addtrack", onTracksChanged)
	textTracks.addEventListener("removetrack", emitTracks)
	const audioList = (element as ElementWithAudio).audioTracks
	audioList?.addEventListener("addtrack", emitTracks)
	/**
	 * Registered before hls-video-element's own `change` listener, which reads `this.api.audioTracks`. The tracks list fires `change` in a microtask after the element
	 * nulls `api` on teardown, so it must be swallowed after destroy and is intentionally never removed.
	 */
	const onAudioChange = (event: Event) => {
		if (destroyed) {
			event.stopImmediatePropagation()
			return
		}
		emitTracks()
	}
	audioList?.addEventListener("change", onAudioChange)

	if (frameElement.requestVideoFrameCallback) {
		frameHandle = frameElement.requestVideoFrameCallback(emitFirstFrame)
	}

	queueMicrotask(() => {
		emit({ type: "ready" })
		if (chaptersList.length > 0) adapter.setChapters?.(chaptersList)
		if (options.autoplay && !destroyed) {
			element.play().catch((error: unknown) => {
				if (error instanceof Error && error.name === "NotAllowedError")
					emit({ type: "blocked" })
			})
		}
	})

	const adapter: ProviderAdapter = {
		element,
		extras: config.extras ?? {},
		play: () => element.play(),
		pause: () => element.pause(),
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
		setLoop: (loop) => {
			element.loop = loop
		},
		setTextTrack: (id) => {
			for (let i = 0; i < element.textTracks.length; i++) {
				const track = element.textTracks[i]
				if (!track) continue
				if (track.kind !== "captions" && track.kind !== "subtitles") continue
				track.mode =
					id !== null && trackId(track, i) === id ? "hidden" : "disabled"
			}
			emitTracks()
		},
		setAudioTrack: (id) => {
			const list = (element as ElementWithAudio).audioTracks
			if (!list) return
			for (let i = 0; i < list.length; i++) {
				const track = list[i]
				if (track) track.enabled = (track.id || String(i)) === id
			}
		},
		setChapters: (chapters) => {
			chaptersList = chapters
			if (config.chapterApi) {
				chaptersPending = true
				flushChapters()
			}
			emit({ type: "chapters", chapters })
		},
		requestPictureInPicture: async () => {
			await element.requestPictureInPicture()
		},
		promptRemotePlayback: async () => {
			await (element as ElementWithAudio).remote?.prompt()
		},
		destroy: () => {
			if (destroyed) return
			destroyed = true
			for (const [type, listener] of listeners)
				element.removeEventListener(type, listener)
			textTracks.removeEventListener("addtrack", onTracksChanged)
			textTracks.removeEventListener("removetrack", emitTracks)
			audioList?.removeEventListener("addtrack", emitTracks)
			if (frameHandle !== undefined)
				frameElement.cancelVideoFrameCallback?.(frameHandle)
			if (playFrameHandle !== undefined)
				frameElement.cancelVideoFrameCallback?.(playFrameHandle)
			chaptersPending = false
			element.pause()
			if (config.teardown) config.teardown(element)
			else {
				for (const node of Array.from(element.querySelectorAll("source")))
					node.remove()
				element.removeAttribute("src")
				element.load()
			}
			element.remove()
			debugCounters.elements -= 1
		},
	}
	return adapter
}
