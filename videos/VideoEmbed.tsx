import ClientOnly from "library/ClientOnly"
import type { DeepAssetMeta } from "library/sanity/assetMetadata"
import { css, fresponsive, styled } from "library/styled"
import ReactPlayer from "react-player"
import type { Video } from "sanity.types"

type VideoEmbedProps = {
	className?: string
	url?: string | null
	playbackId?: string | null
	thumbnail?: string | null
}

/**
 * Extract VideoEmbed props from a generic `video` schema object.
 */
export function getVideoProps(video: DeepAssetMeta<Video>): VideoEmbedProps {
	if (video.sourceType === "mux") {
		return {
			playbackId: video.muxVideo?.data?.playbackId,
			thumbnail: video.muxVideo?.data?.videoThumbnailUrl,
		}
	}
	return { url: video.url }
}

/**
 * A React component for playing a variety of URLs, including file paths, HLS, DASH, YouTube, Vimeo, Wistia and Mux.
 */
export function VideoEmbed({ className, url, playbackId, thumbnail }: VideoEmbedProps) {
	const src = url || (playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null)
	if (!src) return null

	return (
		<ClientOnly>
			<Embed className={className}>
				<ReactPlayer src={src} width="100%" height="100%" controls light={thumbnail || undefined} />
			</Embed>
		</ClientOnly>
	)
}

const Embed = styled(
	"div",
	fresponsive(css`
		width: 100%;
		aspect-ratio: 16 / 9;

		> div {
			width: 100% !important;
			height: 100% !important;
		}
	`),
)
