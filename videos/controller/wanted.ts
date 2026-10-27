import type { VideoState } from "library/videos/types"

export interface WantedState {
	wanted: VideoState["wanted"]
	wantedOrigin: VideoState["wantedOrigin"]
}

export const EMPTY_WANTED: WantedState = { wanted: null, wantedOrigin: null }

export function applyManual(
	_current: WantedState,
	wanted: "play" | "pause",
): WantedState {
	return { wanted, wantedOrigin: "manual" }
}

export function applyTrigger(
	current: WantedState,
	wanted: "play" | "pause",
): WantedState {
	if (current.wantedOrigin === "manual") return current
	return { wanted, wantedOrigin: "trigger" }
}

export function release(current: WantedState): WantedState {
	if (current.wantedOrigin === "manual") return EMPTY_WANTED
	return current
}
