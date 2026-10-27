"use client"

import { UniversalVideo } from "library/videos/UniversalVideo"
import type { VideoLabels } from "library/videos/types"
import { type Ref, useEffect, useRef } from "react"
import { type LegacyMediaEvent, useLegacyBridge, warnIgnored } from "./legacy"

const DEFAULT_ENDED_MOE = 0.034
const isApproximatelyEqual = (x: number, y: number, moe = DEFAULT_ENDED_MOE) =>
	Math.abs(x - y) <= moe

export const isPseudoEnded = (
	mediaEl: HTMLMediaElement,
	moe = DEFAULT_ENDED_MOE,
) => {
	return (
		mediaEl.currentTime >= mediaEl.duration ||
		(mediaEl.paused &&
			isApproximatelyEqual(mediaEl.currentTime, mediaEl.duration, moe))
	)
}

export interface MuxVideoProps {
	playbackId?: string
	/** Alias of `mode="autoplay"` on `UniversalVideo`. */
	autoPlay?: boolean
	/** Seconds to seek to when autoplay is blocked, then an `ended` event is dispatched. Defaults to the duration. */
	autoPlayFallbackTime?: number
	className?: string
	/** @deprecated Not forwarded, inline styles are not supported. */
	style?: React.CSSProperties
	muted?: boolean
	loop?: boolean
	/** @deprecated Ignored. */
	playsInline?: boolean
	/** @deprecated Ignored. */
	preload?: "none" | "metadata" | "auto" | ""
	/** @deprecated Ignored. */
	preloadTrackable?: boolean
	controls?: boolean
	/** Poster image URL. */
	poster?: string
	onTimeUpdate?: (event: LegacyMediaEvent) => void
	onPlay?: (event: LegacyMediaEvent) => void
	onPause?: (event: LegacyMediaEvent) => void
	onSeeked?: (event: LegacyMediaEvent) => void
	onEnded?: (event: Event) => void
	/** Override control and overlay labels. */
	labels?: Partial<VideoLabels>
	ref?: Ref<HTMLVideoElement>
}

/**
 * @deprecated Use `UniversalVideo`. Callbacks receive a minimal event object with `type`, `target` and `currentTarget`.
 */
export function MuxVideo({
	playbackId,
	autoPlay,
	autoPlayFallbackTime,
	className,
	style,
	muted,
	loop,
	controls = false,
	poster,
	preload,
	playsInline,
	preloadTrackable,
	onTimeUpdate,
	onPlay,
	onPause,
	onSeeked,
	onEnded,
	labels,
	ref: mediaRef,
}: MuxVideoProps) {
	const swallowEnded = useRef(false)
	const { ref, getVideo, makeEvent } = useLegacyBridge({
		mediaRef,
		listeners: {
			seeked: (event) => onSeeked?.(makeEvent(event.type)),
		},
	})
	useEffect(() => {
		const ignored: string[] = []
		if (style) ignored.push("style")
		if (preload !== undefined) ignored.push("preload")
		if (playsInline !== undefined) ignored.push("playsInline")
		if (preloadTrackable !== undefined) ignored.push("preloadTrackable")
		warnIgnored("MuxVideo", ignored)
	}, [style, preload, playsInline, preloadTrackable])

	const handleBlocked = () => {
		if (!autoPlay) return
		const element = getVideo()
		if (!element) return
		element.currentTime = autoPlayFallbackTime ?? element.duration
		element.preload = "metadata"
		const event = new Event("ended")
		swallowEnded.current = true
		element.dispatchEvent(event)
		swallowEnded.current = false
		onEnded?.(event)
	}

	return (
		<UniversalVideo
			ref={ref}
			mode={autoPlay ? "autoplay" : "click"}
			playbackId={playbackId}
			className={className}
			muted={muted}
			loop={loop}
			controls={controls}
			labels={labels}
			poster={poster ? { src: poster, width: 1920, height: 1080 } : undefined}
			mux={{ preferPlayback: "mse", renditionOrder: "desc" }}
			onTimeUpdate={() => onTimeUpdate?.(makeEvent("timeupdate"))}
			onPlay={() => onPlay?.(makeEvent("play"))}
			onPause={() => onPause?.(makeEvent("pause"))}
			onEnded={() => {
				if (!swallowEnded.current) onEnded?.(new Event("ended"))
			}}
			onBlocked={handleBlocked}
		/>
	)
}
