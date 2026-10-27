import type { VideoLogger } from "library/videos/debug"
import type { VideoProvider } from "library/videos/types"

export const debugCounters = {
	mounted: 0,
	observers: 0,
	elements: 0,
}

interface Slot {
	grant: () => void
	provider: VideoProvider
	granted: boolean
	max: number
}

const active = new Set<Slot>()
const waiting: Slot[] = []

function warnYouTube() {
	if (process.env.NODE_ENV === "production") return
	let count = 0
	for (const slot of active) if (slot.provider === "youtube") count += 1
	if (count > 1)
		console.warn("UniversalVideo: more than one autoplaying YouTube player on the page")
}

/** Grants waiting slots oldest first. Each slot is checked against its own cap, so mixed `maxConcurrent` values on one page cannot overrun each other. */
function drain() {
	for (const next of waiting.slice()) {
		if (active.size >= next.max) continue
		const index = waiting.indexOf(next)
		if (index < 0) continue
		waiting.splice(index, 1)
		next.granted = true
		active.add(next)
		warnYouTube()
		next.grant()
	}
}

export interface VideoSlot {
	/** Asks for a play slot. Calls `grant` now or when one frees, oldest first. */
	request: () => void
	/** Frees the slot or leaves the wait list. */
	release: () => void
	isGranted: () => boolean
}

/** Caps concurrently playing trigger-driven videos. User-initiated play never goes through here. */
export function createVideoSlot(
	provider: VideoProvider,
	max: number,
	grant: () => void,
	log?: VideoLogger,
): VideoSlot {
	const slot: Slot = {
		max,
		grant: () => {
			log?.("slot granted", { active: active.size, max })
			grant()
		},
		provider,
		granted: false,
	}
	return {
		request() {
			if (slot.granted || waiting.includes(slot)) return
			waiting.push(slot)
			drain()
			if (!slot.granted)
				log?.("slot denied, waiting", {
					active: active.size,
					waiting: waiting.length,
					max,
				})
		},
		release() {
			const index = waiting.indexOf(slot)
			if (index >= 0) waiting.splice(index, 1)
			if (slot.granted) {
				log?.("slot released")
				slot.granted = false
				active.delete(slot)
				drain()
			}
		},
		isGranted: () => slot.granted,
	}
}

/** Dev counters for the carousel test: mounted instances, live observers, playing slots, retained media elements. */
export function getVideoDebugStats() {
	return {
		mounted: debugCounters.mounted,
		observers: debugCounters.observers,
		playing: active.size,
		elements: debugCounters.elements,
	}
}
