"use client"

import { browserData } from "library/deviceDetection"
import type { SanityImageData } from "library/sanity/SanityImage"
import { UniversalVideo } from "library/videos/UniversalVideo"
import type { StaticImageData } from "next/image"
import { type Ref, useSyncExternalStore } from "react"
import { useLegacyBridge } from "./legacy"

function subscribeNothing() {
	return () => undefined
}

/**
 * @deprecated Use `UniversalVideo` with `mode="background"`. `videoBlurUrl` and `videoDuration` are ignored.
 */
export function CarouselBackgroundVideo({
	playbackId,
	videoAspectRatio,
	poster,
	play,
	muted = true,
	minResolution = "480p",
	maxResolution,
	renditionOrder,
	className,
	loop = false,
	ref: containerRef,
	videoRef,
	onEnded,
	onTimeUpdate,
	onLoadedMetadata,
	onPlaying,
	safariOptimized = false,
	eager = false,
}: {
	playbackId?: string
	/** @deprecated Ignored, blur placeholders were removed. */
	videoBlurUrl?: string
	videoAspectRatio?: string
	/** @deprecated Ignored. */
	videoDuration?: number
	poster?: SanityImageData<"false"> | StaticImageData
	play?: boolean
	muted?: boolean
	minResolution?: "480p" | "540p" | "720p" | "1080p" | "1440p" | "2160p"
	maxResolution?: "480p" | "540p" | "720p" | "1080p" | "1440p" | "2160p"
	renditionOrder?: "desc"
	loop?: boolean
	className?: string
	/** The container element. */
	ref?: Ref<HTMLDivElement>
	/** The media element, set once the player has mounted. */
	videoRef?: Ref<HTMLVideoElement>
	/** @deprecated Alias of `eager` on Safari. */
	safariOptimized?: boolean
	eager?: boolean
	onEnded?: (e?: React.SyntheticEvent<HTMLVideoElement, Event>) => void
	onTimeUpdate?: (currentTime: number, duration: number) => void
	onLoadedMetadata?: (duration: number) => void
	/** Fires on the media element's `playing` event. */
	onPlaying?: () => void
}) {
	const isSafari = useSyncExternalStore(
		subscribeNothing,
		() => browserData.isSafari === true,
		() => false,
	)
	const { ref } = useLegacyBridge({
		containerRef,
		mediaRef: videoRef,
		listeners: {
			loadedmetadata: (_event, element) => {
				if (element.duration) onLoadedMetadata?.(element.duration)
			},
			playing: () => onPlaying?.(),
		},
	})

	return (
		<UniversalVideo
			ref={ref}
			mode="background"
			playbackId={playbackId}
			aspectRatio={videoAspectRatio}
			poster={poster}
			eager={eager || (safariOptimized && isSafari)}
			play={play}
			muted={muted}
			loop={loop}
			mux={{ minResolution, maxResolution, renditionOrder }}
			showPause={false}
			className={className}
			onEnded={() => onEnded?.()}
			onTimeUpdate={onTimeUpdate}
		/>
	)
}
