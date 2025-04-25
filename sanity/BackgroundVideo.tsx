"use client"

import MuxVideo from "@mux/mux-video-react"
import type { AssetMeta } from "./assetMetadata"
import { useCombinedRefs } from "library/useCombinedRefs"
import { useEffect, useRef, useState } from "react"

export function BackgroundVideo({
	data,
	play = true,
	...props
}: {
	/**
	 * asset metadata from sanity
	 */
	data: AssetMeta | undefined
	/**
	 * should the video start playing immediately?
	 * @default true
	 */
	play?: boolean
	loop?: boolean
	className?: string
	ref?: React.Ref<HTMLVideoElement>
}) {
	const [playbackFailedAtWidth, setPlaybackFailedAtWidth] = useState<
		false | number
	>(false)
	const video = useRef<HTMLVideoElement>(null)

	const roundedWidth = playbackFailedAtWidth
		? Math.floor(playbackFailedAtWidth / 100) * 100
		: playbackFailedAtWidth

	useEffect(() => {
		if (play)
			video.current
				?.play()
				.catch(() => setPlaybackFailedAtWidth(window.innerWidth))
		else video.current?.pause()
	}, [play])

	return (
		<MuxVideo
			{...props}
			ref={useCombinedRefs(video, props.ref)}
			playbackId={
				// once the video has failed, don't try to play it again
				playbackFailedAtWidth ? undefined : data?.playbackId
			}
			muted
			playsInline
			poster={
				roundedWidth
					? `https://image.mux.com/${data?.playbackId}/thumbnail.webp?time=${data?.videoDuration}&width=${roundedWidth}`
					: data?.videoBlurUrl
			}
			style={{ aspectRatio: data?.videoAspectRatio }}
			streamType="on-demand"
		/>
	)
}
