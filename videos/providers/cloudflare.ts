import "cloudflare-video-element"
import { debugCounters } from "library/videos/trigger/concurrency"
import type { AdapterEvent, ProviderAdapterFactory } from "library/videos/types"

const TIME_INTERVAL_MS = 250
const EXTRA_EVENTS = ["stream-adstart", "stream-adend", "stream-adtimeout"]

interface CloudflareElement extends HTMLElement {
	currentTime: number
	volume: number
	muted: boolean
	loop: boolean
	playbackRate: number
	readonly duration: number
	readonly buffered: TimeRanges | undefined
	readonly ended: boolean
	play: () => Promise<void> | undefined
	pause: () => Promise<void>
}

function defaultCaptionLanguage(languages: (string | undefined)[]) {
	const fromTracks = languages.find(Boolean)
	if (fromTracks) return fromTracks
	return navigator.language.split("-")[0] ?? "en"
}

export const factory: ProviderAdapterFactory = {
	mount: (container, options) => {
		const { source } = options
		if (source.provider !== "cloudflare")
			throw new Error("The Cloudflare adapter needs a Cloudflare source")
		const element = document.createElement(
			"cloudflare-video",
		) as CloudflareElement
		let destroyed = false
		let lastTime = 0
		let firstFrameSent = false

		const emit = (event: AdapterEvent) => {
			if (!destroyed) options.emit(event)
		}
		const readBufferedEnd = () => {
			const { buffered } = element
			if (!buffered || buffered.length === 0) return element.currentTime
			return buffered.end(buffered.length - 1)
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
		const listeners: [string, () => void][] = [
			["loadstart", () => emit({ type: "loading" })],
			[
				"loadcomplete",
				() => {
					if (options.startTime !== undefined && options.startTime > 0)
						element.currentTime = options.startTime
					emit({ type: "ready" })
				},
			],
			["durationchange", emitTime],
			[
				"timeupdate",
				() => {
					if (performance.now() - lastTime >= TIME_INTERVAL_MS) emitTime()
				},
			],
			["progress", emitTime],
			["playing", onPlaying],
			["pause", onPause],
			["waiting", () => emit({ type: "waiting" })],
			["ended", onEnded],
			[
				"volumechange",
				() =>
					emit({
						type: "volume",
						volume: element.volume,
						muted: element.muted,
					}),
			],
			[
				"ratechange",
				() => emit({ type: "rate", playbackRate: element.playbackRate }),
			],
			[
				"error",
				() =>
					emit({
						type: "error",
						error: {
							code: "cloudflare_error",
							message: "Cloudflare Stream playback error",
							retryable: false,
							provider: "cloudflare",
						},
					}),
			],
		]
		for (const name of EXTRA_EVENTS)
			listeners.push([name, () => emit({ type: "extra", name })])
		for (const [type, listener] of listeners)
			element.addEventListener(type, listener)

		if (options.muted) element.setAttribute("muted", "")
		if (options.loop) element.setAttribute("loop", "")
		if (options.autoplay) element.setAttribute("autoplay", "")
		if (options.controls === "provider") element.setAttribute("controls", "")
		element.setAttribute("preload", options.preload)
		element.setAttribute("playsinline", "")
		if (options.startTime !== undefined && options.startTime > 0)
			element.setAttribute("starttime", String(Math.floor(options.startTime)))
		if (options.captionsDefault === "on")
			element.setAttribute(
				"defaulttexttrack",
				defaultCaptionLanguage(options.tracks.map((track) => track.language)),
			)
		if (options.label) element.setAttribute("aria-label", options.label)
		else if (options.background) element.setAttribute("aria-hidden", "true")
		element.setAttribute("src", `https://iframe.videodelivery.net/${source.id}`)
		container.append(element)
		debugCounters.elements += 1

		return {
			element,
			extras: {},
			play: async () => {
				try {
					await element.play()
				} catch (error) {
					if (error instanceof DOMException) {
						if (error.name === "AbortError") return
						if (error.name === "NotAllowedError") emit({ type: "blocked" })
					}
					throw error
				}
			},
			pause: () => {
				void element.pause()
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
			setLoop: (loop) => {
				element.loop = loop
			},
			destroy: () => {
				if (destroyed) return
				destroyed = true
				for (const [type, listener] of listeners)
					element.removeEventListener(type, listener)
				void element.pause()
				element.remove()
				debugCounters.elements -= 1
			},
		}
	},
}
