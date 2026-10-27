import { createProgressTracker, getPercent } from "library/videos/analytics/progress"
import { isTrackingAllowed } from "library/videos/analytics/privacy"
import type {
	VideoAnalyticsOptions,
	VideoEvent,
	VideoMode,
	VideoProvider,
} from "library/videos/types"

export interface AnalyticsContext {
	provider: VideoProvider
	videoId: string
	title?: string
	url?: string
}

export interface AnalyticsSettings {
	/** Resolved analytics value: per-video prop, else site config. */
	analytics: boolean | VideoAnalyticsOptions | undefined
	canTrack?: () => boolean
	mode?: VideoMode
	loop?: boolean
	getVisible?: () => boolean
}

export interface AnalyticsInput {
	type: "start" | "pause" | "complete" | "error"
	currentTime: number
	duration: number
	errorCode?: string | number
	errorMessage?: string
}

export interface VideoAnalytics {
	/** Builds the normalized event, pushes it to dataLayer when allowed, and returns it (or null when suppressed) for onVideoEvent. */
	handle: (input: AnalyticsInput) => VideoEvent | null
	/** Feed natural playback time updates. Returns progress events crossed by this update. */
	time: (currentTime: number, duration: number) => VideoEvent[]
	/** Call when the source reloads: re-arms start and progress thresholds. */
	reset: () => void
	/** Updates context after the title or id resolves. */
	setContext: (context: Partial<AnalyticsContext>) => void
}

interface DataLayerEvent {
	event: string
	video_provider: string
	video_id: string
	video_title?: string
	video_url?: string
	video_duration: number
	video_current_time: number
	video_percent: number
	video_mode?: string
	visible?: boolean
	video_error_code?: string | number
	video_error_message?: string
}

export function isAnalyticsEnabled(analytics: boolean | VideoAnalyticsOptions | undefined): boolean {
	return analytics === true || (typeof analytics === "object" && analytics !== null)
}

export function getDataLayer(): unknown[] | null {
	if (typeof window === "undefined") return null
	const layer: unknown = Reflect.get(window, "dataLayer")
	return Array.isArray(layer) ? layer : null
}

export function toDataLayerEvent(
	event: VideoEvent,
	extra: { mode?: VideoMode; visible?: boolean; errorMessage?: string },
): DataLayerEvent {
	return {
		event: `video_${event.type}`,
		video_provider: event.provider,
		video_id: event.videoId,
		video_title: event.title,
		video_url: event.url,
		video_duration: event.duration,
		video_current_time: event.currentTime,
		video_percent: event.percent ?? getPercent(event.currentTime, event.duration),
		video_mode: extra.mode,
		visible: extra.visible,
		video_error_code: event.errorCode,
		video_error_message: extra.errorMessage,
	}
}

export function createAnalytics(
	settings: AnalyticsSettings,
	initialContext: AnalyticsContext,
): VideoAnalytics {
	let context = initialContext
	const options = typeof settings.analytics === "object" ? settings.analytics : undefined
	const enabled = isAnalyticsEnabled(settings.analytics)
	const tracker = createProgressTracker(options?.progress)
	let started = false

	function build(
		type: VideoEvent["type"],
		currentTime: number,
		duration: number,
		percent: number,
		errorCode?: string | number,
	): VideoEvent {
		return {
			type,
			provider: context.provider,
			videoId: context.videoId,
			title: options?.title ?? context.title,
			url: context.url,
			currentTime,
			duration,
			percent,
			errorCode,
		}
	}

	function push(event: VideoEvent, errorMessage?: string) {
		if (!enabled) return
		if (!isTrackingAllowed(settings.canTrack)) return
		const layer = getDataLayer()
		if (!layer) return
		const visible = settings.getVisible ? settings.getVisible() : undefined
		layer.push(toDataLayerEvent(event, { mode: settings.mode, visible, errorMessage }))
	}

	return {
		handle(input) {
			if (input.type === "start") {
				if (started) return null
				started = true
				const event = build("start", input.currentTime, input.duration, 0)
				push(event)
				return event
			}
			if (input.type === "complete") {
				if (settings.loop === true) return null
				const event = build("complete", input.currentTime, input.duration, 100)
				push(event)
				return event
			}
			if (input.type === "error") {
				const event = build(
					"error",
					input.currentTime,
					input.duration,
					getPercent(input.currentTime, input.duration),
					input.errorCode,
				)
				push(event, input.errorMessage)
				return event
			}
			const event = build(
				"pause",
				input.currentTime,
				input.duration,
				getPercent(input.currentTime, input.duration),
			)
			push(event)
			return event
		},
		time(currentTime, duration) {
			const crossed = tracker.update(currentTime, duration)
			const events = crossed.map((percent) => build("progress", currentTime, duration, percent))
			for (const event of events) push(event)
			return events
		},
		reset() {
			started = false
			tracker.reset()
		},
		setContext(next) {
			context = { ...context, ...next }
		},
	}
}
