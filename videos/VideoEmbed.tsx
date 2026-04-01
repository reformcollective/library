import ClientOnly from "library/ClientOnly"
import type { DeepAssetMeta } from "library/sanity/assetMetadata"
import { css, f, styled } from "library/styled/alpha"
import { stegaClean } from "next-sanity"
import { useRef } from "react"
import ReactPlayer from "react-player"
import type { Video } from "sanity.types"

type VideoEmbedProps = Omit<
	React.ComponentPropsWithoutRef<typeof ReactPlayer>,
	"src" | "width" | "height"
> & {
	className?: string
	video: DeepAssetMeta<Video>
	controls?: boolean
	/** When true, seeks to 0 each time playback starts */
	resetOnPlay?: boolean
}

function getVideoSrc(video: DeepAssetMeta<Video>) {
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
	...props
}: VideoEmbedProps) {
	const { src } = getVideoSrc(video)
	const playerRef = useRef<HTMLVideoElement>(null)

	if (!src) return null

	return (
		<ClientOnly>
			<Embed className={className}>
				<ReactPlayer
					ref={playerRef}
					src={src}
					width="100%"
					height="100%"
					controls={controls}
					onPlay={
						resetOnPlay
							? (e) => {
									const el = playerRef.current
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
