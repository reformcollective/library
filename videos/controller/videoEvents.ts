"use client"

import { createAnalytics } from "library/videos/analytics/analytics"
import type {
	VideoAnalyticsOptions,
	VideoController,
	VideoEvent,
	VideoMode,
	VideoProvider,
	VideoState,
} from "library/videos/types"
import { useEffect, useRef } from "react"

export interface VideoEventSettings {
	provider: VideoProvider
	videoId: string
	title?: string
	url?: string
	mode: VideoMode
	loop: boolean
	analytics: boolean | VideoAnalyticsOptions | undefined
	canTrack?: () => boolean
	onVideoEvent?: (event: VideoEvent) => void
}

/** Feeds controller state transitions to the analytics module and calls onVideoEvent with each normalized event. */
export function useVideoEvents(
	controller: VideoController,
	settings: VideoEventSettings,
) {
	const latest = useRef(settings)
	useEffect(() => {
		latest.current = settings
	})
	const { provider, videoId, title, url, mode, loop, analytics } = settings
	const analyticsKey = JSON.stringify(analytics ?? false)

	// biome-ignore lint/correctness/useExhaustiveDependencies: the tracker is rebuilt when any of these change
	useEffect(() => {
		const current = latest.current
		const tracker = createAnalytics(
			{
				analytics: current.analytics,
				canTrack: () => latest.current.canTrack?.() !== false,
				mode: current.mode,
				loop: current.loop,
				getVisible: () => document.visibilityState === "visible",
			},
			{
				provider: current.provider,
				videoId: current.videoId,
				title: current.title,
				url: current.url,
			},
		)
		const deliver = (event: VideoEvent | null) => {
			if (event) latest.current.onVideoEvent?.(event)
		}
		let previous: VideoState = controller.getState()

		const unsubscribe = controller.subscribe(() => {
			const state = controller.getState()
			if (state.status === "idle" && previous.status !== "idle") tracker.reset()
			if (state.status === "playing") {
				if (previous.status !== "playing")
					deliver(
						tracker.handle({
							type: "start",
							currentTime: state.currentTime,
							duration: state.duration,
						}),
					)
				if (state.currentTime !== previous.currentTime) {
					for (const event of tracker.time(state.currentTime, state.duration))
						deliver(event)
				}
			}
			if (previous.status === "playing" && state.status === "paused") {
				deliver(
					tracker.handle({
						type: "pause",
						currentTime: state.currentTime,
						duration: state.duration,
					}),
				)
			}
			if (state.status === "ended" && previous.status !== "ended") {
				deliver(
					tracker.handle({
						type: "complete",
						currentTime: state.currentTime,
						duration: state.duration,
					}),
				)
			}
			if (
				state.status === "error" &&
				previous.status !== "error" &&
				state.error
			) {
				deliver(
					tracker.handle({
						type: "error",
						currentTime: state.currentTime,
						duration: state.duration,
						errorCode: state.error.code,
						errorMessage: state.error.message,
					}),
				)
			}
			previous = state
		})
		return unsubscribe
	}, [controller, provider, videoId, title, url, mode, loop, analyticsKey])
}
