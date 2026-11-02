"use client"

import { library } from "library/layers.css"
import type { VideoField } from "library/sanity/assetMetadata"
import { css, f, styled } from "library/styled"
import type { VideoError } from "library/videos/types"
import { UniversalVideo } from "library/videos/UniversalVideo"
import { type Ref, useEffect } from "react"
import { type LegacyMediaEvent, useLegacyBridge, warnIgnored } from "./legacy"

const HANDLED_PROPS = new Set([
	"video",
	"controls",
	"resetOnPlay",
	"className",
	"ref",
	"playing",
	"muted",
	"loop",
	"onReady",
	"onPlay",
	"onPause",
	"onEnded",
	"onError",
	"onTimeUpdate",
	"onProgress",
	"playsInline",
])

export type VideoEmbedProps = {
	video: VideoField
	controls?: boolean
	/** Seeks to 0 each time playback starts. */
	resetOnPlay?: boolean
	className?: string
	ref?: Ref<HTMLVideoElement>
	/** Alias of `play` on `UniversalVideo`. */
	playing?: boolean
	muted?: boolean
	loop?: boolean
	onReady?: (event: LegacyMediaEvent) => void
	onPlay?: (event: LegacyMediaEvent) => void
	onPause?: (event: LegacyMediaEvent) => void
	onEnded?: (event: LegacyMediaEvent) => void
	onError?: (error: VideoError) => void
	onTimeUpdate?: (event: LegacyMediaEvent) => void
	onProgress?: (event: LegacyMediaEvent) => void
	/** Other react-player props are ignored with a dev warning. */
	[ignored: string]: unknown
}

/**
 * @deprecated Use `UniversalVideo` with the `video` prop. Only the props listed here are forwarded.
 */
export function VideoEmbed({
	video,
	controls = true,
	resetOnPlay,
	className,
	ref: mediaRef,
	playing,
	muted,
	loop,
	onReady,
	onPlay,
	onPause,
	onEnded,
	onError,
	onTimeUpdate,
	onProgress,
	...rest
}: VideoEmbedProps) {
	const { ref, handleRef, makeEvent } = useLegacyBridge({ mediaRef })
	const ignoredKeys = Object.keys(rest).filter((key) => !HANDLED_PROPS.has(key))
	const ignoredSignature = ignoredKeys.join(",")
	useEffect(() => {
		warnIgnored(
			"VideoEmbed",
			ignoredSignature ? ignoredSignature.split(",") : [],
		)
	}, [ignoredSignature])

	return (
		<Embed
			ref={ref}
			video={video}
			mode="click"
			controls={controls}
			play={playing}
			muted={muted}
			loop={loop}
			className={className}
			onReady={() => onReady?.(makeEvent("ready"))}
			onPlay={() => {
				if (resetOnPlay) {
					const handle = handleRef.current
					if (handle && handle.getState().currentTime > 0.1) handle.seek(0)
				}
				onPlay?.(makeEvent("play"))
			}}
			onPause={() => onPause?.(makeEvent("pause"))}
			onEnded={() => onEnded?.(makeEvent("ended"))}
			onError={onError}
			onTimeUpdate={() => {
				onTimeUpdate?.(makeEvent("timeupdate"))
				onProgress?.(makeEvent("progress"))
			}}
		/>
	)
}

const Embed = styled(UniversalVideo, [
	{
		"@layer": {
			[library]: f.unresponsive(css`
				width: 100%;
				height: 100%;
			`),
		},
	},
])
