import type { AdapterEvent } from "library/videos/types"

export interface VideoDebugEntry {
	id: number
	/** Milliseconds since page load. */
	time: number
	level: "log" | "warn"
	label: string
	text: string
}

export type VideoDebugLevel = VideoDebugEntry["level"]

export type VideoLogger = ((event: string, detail?: unknown, level?: VideoDebugLevel) => void) & {
	enabled: () => boolean
}

const MAX_ENTRIES = 200
const EMPTY: VideoDebugEntry[] = []
const buffers = new Map<string, VideoDebugEntry[]>()
const listeners = new Map<string, Set<() => void>>()
const counters = new Map<string, number>()
let nextId = 0

/** True when `window.__UV_DEBUG` is set. Always false in production builds. */
export function isVideoDebug() {
	if (process.env.NODE_ENV === "production" || typeof window === "undefined") return false
	return Reflect.get(window, "__UV_DEBUG") === true
}

export function setVideoDebug(on: boolean) {
	if (typeof window !== "undefined") Reflect.set(window, "__UV_DEBUG", on)
}

/** Last 20 records for a label. The array identity only changes when a record is added. */
export function getVideoDebugEntries(label: string) {
	return buffers.get(label) ?? EMPTY
}

/** Calls `listener` whenever a record is added for `label`. Returns the unsubscribe function. */
export function subscribeVideoDebug(label: string, listener: () => void) {
	const set = listeners.get(label) ?? new Set<() => void>()
	set.add(listener)
	listeners.set(label, set)
	return () => {
		set.delete(listener)
	}
}

function stringify(detail: unknown) {
	if (detail === undefined) return ""
	if (detail instanceof Error) return `${detail.name}: ${detail.message}`
	if (typeof detail === "string") return detail
	const seen = new WeakSet<object>()
	return JSON.stringify(detail, (_key, value: unknown) => {
		if (value instanceof Error) return { name: value.name, message: value.message }
		if (typeof value === "object" && value !== null) {
			if (seen.has(value)) return "[circular]"
			seen.add(value)
		}
		return value
	})
}

function record(label: string, level: VideoDebugLevel, event: string, detail: unknown) {
	const detailText = stringify(detail)
	const text = detailText ? `${event} ${detailText}` : event
	nextId += 1
	const entry: VideoDebugEntry = { id: nextId, time: Math.round(performance.now()), level, label, text }
	buffers.set(label, [...(buffers.get(label) ?? EMPTY).slice(-(MAX_ENTRIES - 1)), entry])
	const line = `[UV ${label}] ${level === "warn" ? "WARN " : ""}${text}`
	if (level === "warn") console.warn(line)
	else console.log(line)
	for (const listener of listeners.get(label) ?? []) listener()
}

/**
 * One logger per player instance. Does nothing unless `force` or `window.__UV_DEBUG` is true.
 * With no `name` the label is `<provider>#<n>`.
 */
export function createVideoLogger(provider: string, name: string | undefined, force: boolean): VideoLogger {
	let label = name
	if (!label) {
		const count = (counters.get(provider) ?? 0) + 1
		counters.set(provider, count)
		label = `${provider}#${count}`
	}
	const finalLabel = label
	const enabled = () => force || isVideoDebug()
	const log = (event: string, detail?: unknown, level: VideoDebugLevel = "log") => {
		if (!enabled()) return
		record(finalLabel, level, event, detail)
	}
	return Object.assign(log, { enabled })
}

/** Logs the lifecycle events of an adapter. Time, volume and other high-frequency events are skipped. */
export function logAdapterEvent(log: VideoLogger, event: AdapterEvent) {
	switch (event.type) {
		case "ready":
		case "loading":
		case "firstFrame":
		case "playing":
		case "paused":
		case "waiting":
		case "ended":
			log(`adapter ${event.type}`)
			break
		case "blocked":
			log("adapter blocked (autoplay or play rejected)", undefined, "warn")
			break
		case "error":
			log("adapter error", event.error, "warn")
			break
		case "extra":
			log(`adapter extra ${event.name}`, event.detail)
			break
		default:
			break
	}
}
