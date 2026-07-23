"use client"

import MuxVideo from "@mux/mux-video-react"
import { ScreenContext } from "library/ScreenContext"
import { css, f, styled } from "library/styled"
import { use, useEffect, useRef, useState } from "react"

export function BackgroundVideo({
	playbackId,
	videoBlurUrl,
	videoAspectRatio,
	videoDuration,
	play = true,
	minResolution = "480p",
	className,
	loop,
	ref: containerRef,
	onEnded,
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
	 * minimum resolution to play the video at
	 */
	minResolution?: "480p" | "540p" | "720p" | "1080p" | "1440p" | "2160p"
	loop?: boolean
	className?: string
	ref?: React.Ref<HTMLDivElement>
	// other video props
	onEnded?: (e?: React.SyntheticEvent<HTMLVideoElement, Event>) => void
}) {
	const video = useRef<HTMLVideoElement>(null)
	const placeholderRef = useRef<HTMLDivElement>(null)
	const [playbackFailure, setPlaybackFailure] = useState<{
		videoId: string
	}>()
	const { innerWidth } = use(ScreenContext)
	const posterSize = Math.min(
		1920,
		Math.max(300, Math.round(innerWidth / 100) * 100),
	)

	// This state now ONLY controls if the <MainVideo> component is rendered.
	const [shouldRenderVideo, setShouldRenderVideo] = useState(false)

	// drives the video's fade-in over the persistent poster (set on `canplay`)
	const [videoReady, setVideoReady] = useState(false)
	// track the id the ready flag belongs to, so a new clip fades in fresh instead of
	// flashing the previous (already-ready) frame
	const [readyForId, setReadyForId] = useState(playbackId)

	/***
	 * if our video id changes, clear the playback failure and reset the fade-in
	 */
	if (playbackFailure && playbackFailure.videoId !== playbackId) {
		setPlaybackFailure(undefined)
	}
	if (readyForId !== playbackId) {
		setReadyForId(playbackId)
		setVideoReady(false)
	}

	// This effect ONLY handles playing and pausing the video.
	useEffect(() => {
		const videoEl = video.current
		if (!shouldRenderVideo || !videoEl || playbackFailure) {
			return
		}

		if (!play) {
			videoEl.pause()
			return
		}

		const fail = () => {
			if (playbackId) setPlaybackFailure({ videoId: playbackId })
			onEnded?.()
		}

		const attemptPlay = () => {
			videoEl.play().catch(fail)
		}

		// a rejected play() can be a real failure, or just a timing artifact from
		// calling play() before the element has buffered enough — readyState < 3
		// (HAVE_FUTURE_DATA) means it hasn't, so retry once it signals it's ready
		// rather than immediately giving up and permanently clearing the video's src.
		// re-check readyState right before attaching: it may have become ready
		// in the gap between this effect scheduling and running (e.g. right after
		// the <video> element itself just mounted), in which case canplay has
		// already fired and would never fire again, leaving us waiting forever.
		if (videoEl.readyState < 3) {
			videoEl.addEventListener("canplay", attemptPlay, { once: true })
			videoEl.addEventListener("error", fail, { once: true })
			if (videoEl.readyState >= 3) {
				videoEl.removeEventListener("canplay", attemptPlay)
				videoEl.removeEventListener("error", fail)
				attemptPlay()
				return
			}
			return () => {
				videoEl.removeEventListener("canplay", attemptPlay)
				videoEl.removeEventListener("error", fail)
			}
		}

		attemptPlay()
	}, [play, shouldRenderVideo, playbackId, playbackFailure, onEnded])

	// mirror of the playback race-guard above: the fade-in relies on the one-shot
	// `canplay` event, but on a warm cache the element can become playable before React
	// attaches onCanPlay — the event fires with nobody listening and never fires again,
	// leaving opacity stuck at 0 (video plays invisibly). reconcile from readyState.
	useEffect(() => {
		const videoEl = video.current
		if (!shouldRenderVideo || !videoEl || playbackFailure) return
		if (videoEl.readyState >= 3) {
			setVideoReady(true)
			return
		}
		const onReady = () => setVideoReady(true)
		videoEl.addEventListener("canplay", onReady, { once: true })
		return () => videoEl.removeEventListener("canplay", onReady)
	}, [shouldRenderVideo, playbackFailure])

	/**
	 * lazy load — use an intersection observer to watch for when the element is
	 * getting close to the screen, and trigger rendering the video
	 */
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					setShouldRenderVideo(true)
					observer.disconnect()
				}
			},
			{
				// we don't want to wait until the video is on screen, but trigger when it's getting close
				rootMargin: "400px",
			},
		)
		const elementToObserve = placeholderRef.current
		if (elementToObserve) observer.observe(elementToObserve)
		return () => observer.disconnect()
	}, [])

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
			{/* Poster stays mounted underneath the video for the element's whole life, so we never
				expose the bare container: it covers the gap before the video can play (no black
				flash) and reappears if iOS evicts a paused offscreen frame (video not "missing"
				on scroll-back). */}
			<PlaceholderDiv
				ref={placeholderRef}
				style={{
					backgroundImage: playbackId
						? `url(https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=${posterSize})`
						: undefined,
				}}
			/>
			{shouldRenderVideo && (
				<MainVideo
					ref={video}
					src={
						// don't attempt to load a video if we don't have one, or if it already failed
						playbackFailure || !playbackId
							? undefined
							: `https://stream.mux.com/${playbackId}.m3u8?min_resolution=${minResolution}`
					}
					preload="auto"
					muted
					playsInline
					loop={loop}
					// force hls.js/MSE instead of native HLS. without this, iOS Safari
					// (which reports native HLS support) takes the native path, where these
					// lazily-mounted background videos don't reliably autoplay. the previous
					// version of this component set this on every video for the same reason.
					preferPlayback="mse"
					poster={
						playbackFailure
							? `https://image.mux.com/${playbackId}/thumbnail.webp?time=${videoDuration}&width=${posterSize}`
							: `https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=${posterSize}`
					}
					streamType="on-demand"
					style={{ opacity: videoReady ? 1 : 0 }}
					onCanPlay={() => setVideoReady(true)}
					onEnded={onEnded}
				/>
			)}
		</Container>
	)
}

const Container = styled("div", {
	...f.responsive(css`
		position: relative;
		isolation: isolate;
		overflow: clip;
	`),
})

const MainVideo = styled(MuxVideo, {
	...f.responsive(css`
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
		object-position: center;
		transition: opacity 0.2s ease-in-out;
	`),
})

const PlaceholderDiv = styled("div", {
	...f.responsive(css`
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background-size: cover;
		background-position: center;
	`),
})
