"use client"

import ClientOnly from "library/ClientOnly"
import type { VideoField } from "library/sanity/assetMetadata"
import { css, f, styled } from "library/styled"
import { useCombinedRefs } from "library/useCombinedRefs"
import { stegaClean } from "next-sanity"
import { useRef } from "react"
import ReactPlayer from "react-player"

type VideoEmbedProps = Omit<
	React.ComponentPropsWithoutRef<typeof ReactPlayer>,
	"src" | "width" | "height"
> & {
	ref?: React.Ref<HTMLVideoElement>
	className?: string
	video: VideoField
	controls?: boolean
	/** When true, seeks to 0 each time playback starts */
	resetOnPlay?: boolean
}

function getVideoSrc(video: VideoField) {
	if (stegaClean(video.sourceType) === "mux") {
		const playbackId = video.muxVideo?.data?.playbackId
		return {
			src: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
			thumbnail: video.muxVideo?.data?.videoThumbnailUrl,
		}
	}
	return { src: video.url ?? null, thumbnail: null }
}

/**
 * A React component for playing a variety of URLs, including file paths, HLS, DASH, YouTube, Vimeo, Wistia and Mux.
 * Accepts a Sanity `video` schema object directly. Fills its container — the parent is responsible for sizing.
 */
export function VideoEmbed({
	className,
	video,
	controls = true,
	resetOnPlay,
	onPlay,
	ref: externalRef,
	...props
}: VideoEmbedProps) {
	const { src } = getVideoSrc(video)
	const internalRef = useRef<HTMLVideoElement>(null)
	const combinedRef = useCombinedRefs(externalRef, internalRef)

	if (!src) return null

	return (
		<ClientOnly>
			<Embed className={className}>
				<ReactPlayer
					ref={combinedRef}
					src={src}
					width="100%"
					height="100%"
					controls={controls}
					onPlay={
						resetOnPlay
							? (e) => {
									const el = internalRef.current
									if (el && el.currentTime > 0.1) {
										el.currentTime = 0
									}
									onPlay?.(e)
								}
							: onPlay
					}
					{...props}
				/>
			</Embed>
		</ClientOnly>
	)
}

const Embed = styled(
	"div",
	f.unresponsive(css`
		width: 100%;
		height: 100%;
		--media-object-fit: cover;
		--media-object-position: center;
	`),
)
