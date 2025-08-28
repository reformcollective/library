"use client"

import MuxVideo from "@mux/mux-video-react"
import { browserData } from "library/deviceDetection"
import { ScreenContext } from "library/ScreenContext"
import { css, f, styled } from "library/styled"
import { use, useEffect, useRef, useState } from "react"

export function CarouselBackgroundVideo({
	playbackId,
	videoBlurUrl,
	videoAspectRatio,
	videoDuration,
	play = true,
	muted = true,
	minResolution = "480p",
	className,
	loop,
	ref: containerRef,
	onEnded,
	onTimeUpdate,
	onLoadedMetadata,
	safariOptimized = false,
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
	 * similar to autoplay, but can also be toggled to pause/play
	 * @default true
	 */
	play?: boolean
	/**
	 * should the video be muted?
	 * can be toggled to mute/unmuted
	 * @default true
	 */
	muted?: boolean
	/**
	 * minimum resolution to play the video at
	 */
	minResolution?: "480p" | "540p" | "720p" | "1080p" | "1440p" | "2160p"
	loop?: boolean
	className?: string
	ref?: React.Ref<HTMLDivElement>
	/**
	 * use safari-optimized loading strategy (immediate load with metadata preload)
	 * recommended for carousel/preview videos
	 */
	safariOptimized?: boolean
	// other video props
	onEnded?: (e?: React.SyntheticEvent<HTMLVideoElement, Event>) => void
	onTimeUpdate?: (currentTime: number, duration: number) => void
	onLoadedMetadata?: (duration: number) => void
}) {
	const video = useRef<HTMLVideoElement>(null)
	const placeholderRef = useRef<HTMLDivElement>(null)
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

	const useSafariOptimization = safariOptimized && browserData.isSafari

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

		const videoHasFinished = video.current?.ended

		if (playbackId && loadVideo && !videoHasFinished)
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
							onEnded?.()
						})
			})
	})

	/**
	 * lazy load
	 */
	useEffect(() => {
		if (useSafariOptimization) {
			setLoadVideo(true)
			return
		}

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
	}, [useSafariOptimization])

	const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
		const videoElement = e.currentTarget
		if (onTimeUpdate && videoElement.duration) {
			onTimeUpdate(videoElement.currentTime, videoElement.duration)
		}
	}

	const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
		const videoElement = e.currentTarget
		if (onLoadedMetadata && videoElement.duration) {
			onLoadedMetadata(videoElement.duration)
		}
	}

	return (
		<Container
			ref={containerRef}
			className={className}
			style={{
				aspectRatio: videoAspectRatio,
				// we'll ideally only see this on really slow networks
				// it's small and will have weird colors, but it's better than nothing
				backgroundImage: videoBlurUrl ? `url('${videoBlurUrl}')` : undefined,
			}}
		>
			{useSafariOptimization && !loadVideo ? (
				<PlaceholderDiv
					ref={placeholderRef}
					style={{
						backgroundImage: playbackId
							? `url(https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=${posterSize})`
							: undefined,
					}}
				/>
			) : (
				<MainVideo
					ref={video}
					src={
						playbackFailure || !playbackId
							? undefined
							: `https://stream.mux.com/${playbackId}.m3u8?min_resolution=${minResolution}`
					}
					preload={
						useSafariOptimization ? "metadata" : loadVideo ? "auto" : "metadata"
					}
					muted={muted}
					playsInline
					loop={loop}
					poster={
						playbackFailure
							? `https://image.mux.com/${playbackId}/thumbnail.webp?time=${videoDuration}&width=${posterSize}`
							: `https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=${posterSize}`
					}
					streamType="on-demand"
					onEnded={onEnded}
					onTimeUpdate={handleTimeUpdate}
					onLoadedMetadata={handleLoadedMetadata}
				/>
			)}
		</Container>
	)
}

const Container = styled("div", {
	...f.responsive(css`
		isolation: isolate;
		overflow: clip;
	`),
})

const MainVideo = styled(MuxVideo, {
	...f.responsive(css`
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
		object-position: center;
	`),
})

const PlaceholderDiv = styled("div", {
	...f.responsive(css`
		width: 100%;
		height: 100%;
		background-size: cover;
		background-position: center;
	`),
})
