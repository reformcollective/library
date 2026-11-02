"use client"

import { library } from "library/layers.css"
import type { ImageField } from "library/sanity/assetMetadata"
import { css, f, styled } from "library/styled"
import { UniversalVideo } from "library/videos/UniversalVideo"
import type { Ref } from "react"
import { useLegacyBridge } from "./legacy"

/**
 * @deprecated Use `UniversalVideo` with `mode="background"`. `videoBlurUrl` and `videoDuration` are ignored.
 */
export function BackgroundVideo({
	playbackId,
	videoAspectRatio,
	eager,
	play,
	muted = true,
	minResolution = "480p",
	className,
	loop = false,
	ref: containerRef,
	onEnded,
	onTimeUpdate,
	onLoadedMetadata,
	posterOverride,
}: {
	playbackId?: string
	/** @deprecated Ignored, blur placeholders were removed. */
	videoBlurUrl?: string
	videoAspectRatio?: string
	/** @deprecated Ignored. */
	videoDuration?: number
	eager?: boolean
	play?: boolean
	muted?: boolean
	minResolution?: "480p" | "540p" | "720p" | "1080p" | "1440p" | "2160p"
	loop?: boolean
	className?: string
	ref?: Ref<HTMLDivElement>
	/** Alias of `poster` on `UniversalVideo`. */
	posterOverride?: ImageField
	onEnded?: (e?: React.SyntheticEvent<HTMLVideoElement, Event>) => void
	onTimeUpdate?: (currentTime: number, duration: number) => void
	onLoadedMetadata?: (duration: number) => void
}) {
	const { ref } = useLegacyBridge({
		containerRef,
		listeners: {
			loadedmetadata: (_event, element) => {
				if (element.duration) onLoadedMetadata?.(element.duration)
			},
		},
	})
	const poster = posterOverride?.asset
		? { ...posterOverride, willHaveAlt: "false" as const }
		: undefined

	return (
		<Background
			ref={ref}
			mode="background"
			playbackId={playbackId}
			aspectRatio={videoAspectRatio}
			eager={eager}
			play={play}
			muted={muted}
			loop={loop}
			mux={{ minResolution }}
			poster={poster}
			showPause={false}
			className={className}
			onEnded={() => onEnded?.()}
			onTimeUpdate={onTimeUpdate}
		/>
	)
}

const Background = styled(UniversalVideo, [
	{
		"@layer": {
			[library]: f.unresponsive(css`
				width: 100%;
				height: 100%;
			`),
		},
	},
])
