import ClientOnly from "library/ClientOnly"
import type { DeepAssetMeta } from "library/sanity/assetMetadata"
import { css, f, styled } from "library/styled/alpha"
import { stegaClean } from "next-sanity"
import ReactPlayer from "react-player"
import type { Video } from "sanity.types"

type VideoEmbedProps = {
	className?: string
	video: DeepAssetMeta<Video>
	controls?: boolean
	playing?: boolean
	muted?: boolean
	loop?: boolean
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
	muted,
	loop,
	playing,
}: VideoEmbedProps) {
	const { src } = getVideoSrc(video)
	if (!src) return null

	return (
		<ClientOnly>
			<Embed className={className}>
				<ReactPlayer
					src={src}
					width="100%"
					height="100%"
					controls={controls}
					muted={muted}
					loop={loop}
					playing={playing}
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
