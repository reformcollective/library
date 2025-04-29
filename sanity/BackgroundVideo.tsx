"use client"

import MuxVideo from "@mux/mux-video-react"
import { ScreenContext } from "library/ScreenContext"
import { useCombinedRefs } from "library/useCombinedRefs"
import { use, useEffect, useRef, useState } from "react"

export function BackgroundVideo({
	playbackId,
	videoBlurUrl,
	videoAspectRatio,
	videoDuration,
	play = true,
	minResolution = "480p",
	...props
}: {
	/**
	 * asset metadata from sanity
	 */
	playbackId?: string
	videoBlurUrl?: string
	videoAspectRatio?: string
	videoDuration?: number
	/**
	 * should the video start playing immediately?
	 * @default true
	 */
	play?: boolean
	/**
	 * minimum resolution to play the video at
	 */
	minResolution?: "480p" | "540p" | "720p" | "1080p" | "1440p" | "2160p"
	loop?: boolean
	className?: string
	ref?: React.Ref<HTMLVideoElement>
}) {
	const video = useRef<HTMLVideoElement>(null)
	const videoPlayPromise = useRef(Promise.resolve())
	const [playbackFailure, setPlaybackFailure] = useState<{
		videoId: string
	}>()
	const { innerWidth } = use(ScreenContext)
	const posterSize = Math.min(
		1920,
		Math.max(300, Math.round(innerWidth / 100) * 100),
	)
	const [loadVideo, setLoadVideo] = useState(false)

	/***
	 * if our video id changes, clear the playback failure
	 */
	if (playbackFailure && playbackFailure.videoId !== playbackId) {
		setPlaybackFailure(undefined)
	}

	/**
	 * autoplay
	 */
	useEffect(() => {
		if (playbackFailure) return

		if (playbackId && loadVideo)
			// we never want to interrupt a play call with another play call
			// so wait for any previous play call to finish before starting a new one
			videoPlayPromise.current.then(() => {
				if (video.current)
					videoPlayPromise.current = video.current
						?.play()
						.then(() => {
							// even if we don't want to play the video, we still want to try!
							// if autoplay is unavailable we want to know about it ASAP
							// even if we're not planning on playing the video
							if (!play) video.current?.pause()
						})
						.catch(() => {
							setPlaybackFailure({ videoId: playbackId })
						})
			})
	}, [play, playbackFailure, playbackId, loadVideo])

	/**
	 * lazy load
	 */
	useEffect(() => {
		// use an intersection observer to watch for when the element is on screen, and trigger the video load
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					setLoadVideo(true)
					observer.disconnect()
				}
			},
			{
				// we don't want to wait until the video is on screen, but trigger when it's getting close
				rootMargin: "400px",
			},
		)
		if (video.current) observer.observe(video.current)
		return () => observer.disconnect()
	}, [])

	return (
		<MuxVideo
			{...props}
			ref={useCombinedRefs(video, props.ref)}
			src={
				// don't attempt to load a video if we don't have one, or if it already failed
				playbackFailure || !playbackId
					? undefined
					: `https://stream.mux.com/${playbackId}.m3u8?min_resolution=${minResolution}`
			}
			// a value of 'metadata' will load the first frame, but not the rest of the video
			// auto will generally load the first few seconds
			preload={loadVideo ? "auto" : "metadata"}
			muted
			playsInline
			poster={
				// mux thumbnails will have different colors than the video itself, so we can't seamlessly
				// switch between the two without some extra effort. we'll rely on the first frame for this
				// instead of using a thumbnail
				playbackFailure
					? `https://image.mux.com/${playbackId}/thumbnail.webp?time=${
							videoDuration
						}&width=${posterSize}`
					: undefined
			}
			style={{
				aspectRatio: videoAspectRatio,
				// we'll ideally only see this on really slow networks
				// it's small and will have weird colors, but it's better than nothing
				backgroundImage: videoBlurUrl ? `url('${videoBlurUrl}')` : undefined,
			}}
			streamType="on-demand"
		/>
	)
}
