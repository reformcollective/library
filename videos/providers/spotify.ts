import "spotify-audio-element"
import { debugCounters } from "library/videos/trigger/concurrency"
import type {
	AdapterEvent,
	ProviderAdapterFactory,
	SpotifyExtras,
} from "library/videos/types"

const TIME_INTERVAL_MS = 250
const ENTITY_TYPES = ["track", "album", "playlist", "episode", "show", "artist"]

interface SpotifyController {
	addListener: (name: string, listener: (event: { data: unknown }) => void) => void
	removeListener?: (name: string, listener: (event: { data: unknown }) => void) => void
	loadUri: (uri: string, preferVideo?: boolean, startAt?: number) => void
	restart: () => void
	destroy?: () => void
}

interface SpotifyElement extends HTMLElement {
	config: { startAt?: number; theme?: "dark" | "light"; preferVideo?: boolean } | null
	currentTime: number
	readonly duration: number
	readonly loadComplete: Promise<void>
	api?: SpotifyController | null
	play: () => Promise<void>
	pause: () => Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function entityType(url: string) {
	const found = ENTITY_TYPES.find((type) => url.includes(`/${type}/`))
	return found ?? "track"
}

function toUri(input: string) {
	if (input.startsWith("spotify:")) return input
	const match = /open\.spotify\.com\/(?:embed\/)?(?:intl-[a-z-]+\/)?(\w+)\/(\w+)/i.exec(input)
	return match ? `spotify:${match[1]}:${match[2]}` : input
}

export const factory: ProviderAdapterFactory = {
	mount: (container, options) => {
		const { source } = options
		if (source.provider !== "spotify")
			throw new Error("The Spotify adapter needs a Spotify source")
		const element = document.createElement("spotify-audio") as SpotifyElement
		let destroyed = false
		let lastTime = 0
		let firstFrameSent = false
		let controller: SpotifyController | null = null

		const emit = (event: AdapterEvent) => {
			if (!destroyed) options.emit(event)
		}
		const emitTime = () => {
			lastTime = performance.now()
			emit({
				type: "time",
				currentTime: element.currentTime,
				duration: element.duration,
				bufferedEnd: element.currentTime,
			})
		}

		const onError = (event: { data: unknown }) => {
			const data = event.data
			const message =
				isRecord(data) && typeof data.message === "string"
					? data.message
					: "Spotify playback error"
			const code =
				isRecord(data) && typeof data.code === "string" ? data.code : "playback_error"
			const recoverable = isRecord(data) && data.recoverable === true
			emit({
				type: "error",
				error: { code, message, retryable: recoverable, provider: "spotify" },
			})
		}
		const onPlaying = () => {
			emit({ type: "playing" })
			if (firstFrameSent) return
			firstFrameSent = true
			emit({ type: "firstFrame" })
		}
		const onEnded = () => {
			emitTime()
			emit({ type: "ended" })
		}
		const listeners: [string, () => void][] = [
			["loadstart", () => emit({ type: "loading" })],
			["loadedmetadata", () => emit({ type: "ready" })],
			["durationchange", emitTime],
			[
				"timeupdate",
				() => {
					if (performance.now() - lastTime >= TIME_INTERVAL_MS) emitTime()
				},
			],
			["waiting", () => emit({ type: "waiting" })],
			["playing", onPlaying],
			["pause", () => emit({ type: "paused" })],
			["ended", onEnded],
		]
		for (const [type, listener] of listeners)
			element.addEventListener(type, listener)

		const config: NonNullable<SpotifyElement["config"]> = {}
		if (options.startTime !== undefined && options.startTime > 0)
			config.startAt = Math.floor(options.startTime)
		element.config = config
		element.setAttribute("controls", "")
		if (options.label) element.setAttribute("aria-label", options.label)
		element.setAttribute(
			"src",
			`https://open.spotify.com/${entityType(source.url)}/${source.id}`,
		)
		container.append(element)
		debugCounters.elements += 1

		void element.loadComplete.then(() => {
			if (destroyed) return
			controller = element.api ?? null
			controller?.addListener("error", onError)
		})

		const extras: SpotifyExtras = {
			loadEntity: (uri, preferVideo, startAt) => {
				controller?.loadUri(toUri(uri), preferVideo, startAt)
			},
			restart: () => {
				controller?.restart()
			},
		}

		return {
			element,
			extras: { spotify: extras },
			play: () => element.play(),
			pause: () => {
				void element.pause()
			},
			seek: (seconds) => {
				element.currentTime = seconds
			},
			setMuted: () => {},
			destroy: () => {
				if (destroyed) return
				destroyed = true
				for (const [type, listener] of listeners)
					element.removeEventListener(type, listener)
				controller?.removeListener?.("error", onError)
				controller?.destroy?.()
				element.remove()
				debugCounters.elements -= 1
			},
		}
	},
}
