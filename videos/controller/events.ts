import type {
	AdapterEvent,
	VideoError,
	VideoEvent,
	VideoState,
} from "library/videos/types"

export type ControllerCommand =
	| "play"
	| "pause"
	| "toggle"
	| "restart"
	| "seek"
	| "setMuted"
	| "setVolume"
	| "setPlaybackRate"
	| "setTextTrack"
	| "setAudioTrack"
	| "setQuality"
	| "setChapter"
	| "requestFullscreen"
	| "exitFullscreen"
	| "requestPictureInPicture"
	| "promptRemotePlayback"
	| "retry"

export interface ControllerEventMap {
	adapter: AdapterEvent
	state: VideoState
	command: { command: ControllerCommand; origin: "user" | "external" | "trigger" }
	extra: { name: string; detail: unknown }
	error: VideoError
	videoEvent: VideoEvent
}

export type ControllerEventName = keyof ControllerEventMap

export type ControllerEventListener<K extends ControllerEventName> = (
	payload: ControllerEventMap[K],
) => void
