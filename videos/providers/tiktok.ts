import "tiktok-video-element"
import { debugCounters } from "library/videos/trigger/concurrency"
import type {
	AdapterEvent,
	ProviderAdapterFactory,
	TikTokExtras,
	VideoError,
} from "library/videos/types"

const TIME_INTERVAL_MS = 250
const PLAYER_FLAG = "x-tiktok-player"

const STATE = {
	init: -1,
	ended: 0,
	playing: 1,
	paused: 2,
	buffering: 3,
} as const

const ERROR_MESSAGES: Record<number, { message: string; retryable: boolean }> =
	{
		1001: { message: "Invalid TikTok video", retryable: false },
		1002: {
			message: "TikTok embedding is disabled for this video",
			retryable: false,
		},
		2001: { message: "TikTok server error", retryable: true },
		2005: {
			message: "TikTok player is temporarily unavailable (too many requests)",
			retryable: true,
		},
		3001: { message: "TikTok playback error", retryable: true },
	}
const AUTOPLAY_ERROR = 3002
const READY_FALLBACK_MS = 2500
const PLAYBACK_ERROR = 3001

interface TikTokElement extends HTMLElement {
	currentTime: number
	muted: boolean
	readonly volume: number
	play: () => Promise<void>
	pause: () => Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function toPlayerError(value: unknown): VideoError | "blocked" {
	const code =
		isRecord(value) && typeof value.errorCode === "number" ? value.errorCode : 0
	if (code === AUTOPLAY_ERROR) return "blocked"
	const known = ERROR_MESSAGES[code]
	return {
		code: code || "tiktok_error",
		message: known?.message ?? "TikTok player error",
		retryable: known?.retryable ?? false,
		provider: "tiktok",
	}
}

export const factory: ProviderAdapterFactory = {
	mount: (container, options) => {
		const { source } = options
		if (source.provider !== "tiktok")
			throw new Error("The TikTok adapter needs a TikTok source")
		const element = document.createElement("tiktok-video") as TikTokElement
		let destroyed = false
		let lastTime = 0
		let firstFrameSent = false
		let duration = Number.NaN
		let playPending = false
		let readySent = false
		let readyFallback: ReturnType<typeof setTimeout> | undefined

		const emit = (event: AdapterEvent) => {
			if (!destroyed) options.emit(event)
		}
		const getIframe = () => element.shadowRoot?.querySelector("iframe") ?? null
		const post = (type: string, value?: unknown) => {
			getIframe()?.contentWindow?.postMessage(
				value === undefined
					? { [PLAYER_FLAG]: true, type }
					: { [PLAYER_FLAG]: true, type, value },
				"*",
			)
		}

		const onMessage = (event: MessageEvent) => {
			if (destroyed) return
			const frame = getIframe()
			if (!frame || event.source !== frame.contentWindow) return
			const message: unknown = event.data
			if (!isRecord(message) || !message[PLAYER_FLAG]) return
			const { type, value } = message
			if (type === "onPlayerReady") {
				clearTimeout(readyFallback)
				if (readySent) {
					if (playPending) post("play")
					return
				}
				readySent = true
				emit({ type: "ready" })
			} else if (type === "onStateChange") {
				if (value === STATE.playing) {
					playPending = false
					emit({ type: "playing" })
					if (!firstFrameSent) {
						firstFrameSent = true
						emit({ type: "firstFrame" })
					}
				} else if (value === STATE.paused) emit({ type: "paused" })
				else if (value === STATE.buffering) emit({ type: "waiting" })
				else if (value === STATE.ended) {
					emit({
						type: "time",
						currentTime: duration,
						duration,
						bufferedEnd: duration,
					})
					emit({ type: "ended" })
				}
			} else if (type === "onCurrentTime") {
				if (!isRecord(value)) return
				const current = Number(value.currentTime)
				duration = Number(value.duration)
				if (performance.now() - lastTime < TIME_INTERVAL_MS) return
				lastTime = performance.now()
				emit({
					type: "time",
					currentTime: current,
					duration,
					bufferedEnd: current,
				})
			} else if (type === "onMute" || type === "onVolumeChange") {
				emit({ type: "volume", volume: element.volume, muted: element.muted })
			} else if (type === "onPlayerError") {
				event.stopImmediatePropagation()
				const code = isRecord(value) ? value.errorCode : undefined
				const rejectedPlay = code === PLAYBACK_ERROR && playPending
				if (rejectedPlay) playPending = false
				const result = rejectedPlay ? "blocked" : toPlayerError(value)
				if (result === "blocked") emit({ type: "blocked" })
				else emit({ type: "error", error: result })
			} else if (type === "onImageChange") {
				event.stopImmediatePropagation()
				emit({ type: "extra", name: "imagechange", detail: value })
			}
		}
		window.addEventListener("message", onMessage)

		if (options.muted) element.setAttribute("muted", "")
		if (options.loop) element.setAttribute("loop", "")
		if (options.autoplay || options.background)
			element.setAttribute("autoplay", "")
		if (options.controls === "provider") element.setAttribute("controls", "")
		if (options.label) element.setAttribute("aria-label", options.label)
		else if (options.background) element.setAttribute("aria-hidden", "true")
		element.setAttribute("src", `https://www.tiktok.com/player/v1/${source.id}`)
		container.append(element)
		debugCounters.elements += 1

		readyFallback = setTimeout(() => {
			if (readySent || destroyed) return
			readySent = true
			emit({ type: "ready" })
		}, READY_FALLBACK_MS)

		const extras: TikTokExtras = {
			navigateTo: (index) => post("navigateTo", index),
		}

		return {
			element,
			extras: { tiktok: extras },
			play: () => {
				playPending = true
				post("play")
				return Promise.resolve()
			},
			pause: () => {
				post("pause")
			},
			seek: (seconds) => {
				post("seekTo", seconds)
			},
			setMuted: (muted) => {
				post(muted ? "mute" : "unMute")
			},
			destroy: () => {
				if (destroyed) return
				destroyed = true
				clearTimeout(readyFallback)
				window.removeEventListener("message", onMessage)
				element.removeAttribute("src")
				element.remove()
				debugCounters.elements -= 1
			},
		}
	},
}
