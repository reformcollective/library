import type {
	AdapterEvent,
	VideoChapter,
	VideoState,
	VideoStatus,
} from "library/videos/types"

const PRESENTED: readonly VideoStatus[] = [
	"ready",
	"playing",
	"paused",
	"ended",
	"stalled",
]

export function hasPresentedFrame(status: VideoStatus) {
	return PRESENTED.includes(status)
}

export function activeChapterIndex(
	chapters: VideoChapter[],
	currentTime: number,
): number | null {
	let index: number | null = null
	for (let i = 0; i < chapters.length; i++) {
		const chapter = chapters[i]
		if (chapter && chapter.startTime <= currentTime) index = i
	}
	return index
}

export function createInitialState(
	muted: boolean,
	chapters: VideoChapter[] = [],
): VideoState {
	return {
		status: "idle",
		paused: true,
		ended: false,
		muted,
		volume: 1,
		currentTime: 0,
		duration: 0,
		bufferedEnd: 0,
		playbackRate: 1,
		waiting: false,
		ready: false,
		framePainted: false,
		isLive: false,
		fullscreen: false,
		textTracks: [],
		activeTextTrack: null,
		audioTracks: [],
		activeAudioTrack: null,
		qualities: [],
		activeQuality: null,
		chapters,
		activeChapter: null,
		error: null,
		wanted: null,
		wantedOrigin: null,
	}
}

/** Returns the state patch for one adapter event. `capabilities`, `extra` and `blocked` side effects are handled by the controller. */
export function reduceAdapterEvent(
	state: VideoState,
	event: AdapterEvent,
): Partial<VideoState> {
	switch (event.type) {
		case "ready": {
			const timedOut = state.status === "error" && state.error?.code === "timeout"
			if (timedOut) return { ready: true, status: "loading", error: null }
			return { ready: true, status: state.status === "idle" ? "loading" : state.status }
		}
		case "loading":
			return PRESENTED.includes(state.status) ? {} : { status: "loading" }
		case "firstFrame": {
			const painted = state.status === "playing" && !state.framePainted
			if (state.status === "idle" || state.status === "loading")
				return { status: "ready" }
			return painted ? { framePainted: true } : {}
		}
		case "playing":
			return {
				status: "playing",
				paused: false,
				ended: false,
				waiting: false,
				error: null,
			}
		case "paused": {
			if (state.status === "ended") return { paused: true }
			if (state.status === "playing" || state.status === "stalled")
				return { status: "paused", paused: true, waiting: false }
			return { paused: true, waiting: false }
		}
		case "waiting":
			return { waiting: true }
		case "ended":
			return { status: "ended", ended: true, paused: true, waiting: false }
		case "blocked":
			return { status: "blocked", paused: true, waiting: false }
		case "time": {
			const duration = Number.isFinite(event.duration)
				? event.duration
				: state.duration
			return {
				currentTime: event.currentTime,
				duration,
				bufferedEnd: event.bufferedEnd,
				activeChapter: activeChapterIndex(state.chapters, event.currentTime),
			}
		}
		case "volume":
			return { volume: event.volume, muted: event.muted }
		case "rate":
			return { playbackRate: event.playbackRate }
		case "live":
			return { isLive: event.isLive }
		case "tracks":
			return {
				textTracks: event.textTracks,
				audioTracks: event.audioTracks,
				activeTextTrack: event.activeTextTrack,
				activeAudioTrack: event.activeAudioTrack,
			}
		case "qualities":
			return { qualities: event.qualities, activeQuality: event.activeQuality }
		case "chapters":
			return {
				chapters: event.chapters,
				activeChapter: activeChapterIndex(event.chapters, state.currentTime),
			}
		case "error":
			return { status: "error", error: event.error, waiting: false }
		case "capabilities":
		case "extra":
			return {}
	}
}
