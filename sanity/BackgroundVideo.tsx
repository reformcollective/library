"use client"

import MuxVideo from "@mux/mux-video-react"
import { useCombinedRefs } from "library/useCombinedRefs"
import { useEffect, useRef, useState } from "react"

export function BackgroundVideo({
	playbackId,
	videoBlurUrl,
	videoAspectRatio,
	videoDuration,
	play = true,
	...props
}: {
	/**
	 * asset metadata from sanity
	 */
	playbackId?: string
	videoBlurUrl?: string
	videoAspectRatio?: number
	videoDuration?: number
	/**
	 * should the video start playing immediately?
	 * @default true
	 */
	play?: boolean
	loop?: boolean
	className?: string
	ref?: React.Ref<HTMLVideoElement>
}) {
	const video = useRef<HTMLVideoElement>(null)
	const videoPlayPromise = useRef(Promise.resolve())
	const [playbackFailure, setPlaybackFailure] = useState<{
		width: number
		videoId: string
	}>()

	if (playbackFailure && playbackFailure.videoId !== playbackId) {
		setPlaybackFailure(undefined)
	}

	useEffect(() => {
		if (playbackFailure) return

		if (play && playbackId)
			// we never want to interrupt a play call with another play call
			// so wait for any previous play call to finish before starting a new one
			videoPlayPromise.current.then(() => {
				if (video.current)
					videoPlayPromise.current = video.current?.play().catch(() => {
						setPlaybackFailure({
							videoId: playbackId,
							width: Math.floor(window.innerWidth / 100) * 100,
						})
					})
			})
		else video.current?.pause()
	}, [play, playbackFailure, playbackId])

	return (
		<MuxVideo
			{...props}
			ref={useCombinedRefs(video, props.ref)}
			playbackId={playbackFailure ? undefined : playbackId}
			muted
			playsInline
			poster={
				playbackFailure
					? `https://image.mux.com/${playbackId}/thumbnail.webp?time=${videoDuration}&width=${playbackFailure.width}`
					: videoBlurUrl
			}
			style={{ aspectRatio: videoAspectRatio }}
			streamType="on-demand"
		/>
	)
}
