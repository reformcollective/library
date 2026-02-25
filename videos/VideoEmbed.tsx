import ClientOnly from "library/ClientOnly"
import type { DeepAssetMeta } from "library/sanity/assetMetadata"
import { css, fresponsive, styled } from "library/styled"
import ReactPlayer from "react-player"
import type { Video } from "sanity.types"

type VideoEmbedProps = {
	className?: string
	video: DeepAssetMeta<Video>
}

function getVideoSrc(video: DeepAssetMeta<Video>) {
	if (video.sourceType === "mux") {
		const playbackId = video.muxVideo?.data?.playbackId
		return {
			src: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
			thumbnail: video.muxVideo?.data?.videoThumbnailUrl,
		}
	}
	return { src: video.url, thumbnail: null }
}

/**
 * A React component for playing a variety of URLs, including file paths, HLS, DASH, YouTube, Vimeo, Wistia and Mux.
 * Accepts a Sanity `video` schema object directly.
 */
export function VideoEmbed({ className, video }: VideoEmbedProps) {
	const { src, thumbnail } = getVideoSrc(video)
	if (!src) return null

	return (
		<ClientOnly>
			<Embed className={className}>
				<ReactPlayer
					src={src}
					width="100%"
					height="100%"
					controls
					light={thumbnail || undefined}
				/>
			</Embed>
		</ClientOnly>
	)
}

const Embed = styled(
	"div",
	fresponsive(css`
		width: 100%;

		> div {
			width: 100% !important;
			height: 100% !important;
		}
	`),
)
