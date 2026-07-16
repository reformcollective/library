import MuxVideo from "@mux/mux-video-react"
import { browserData } from "library/deviceDetection"
import { library } from "library/layers.css"
import { ScreenContext } from "library/ScreenContext"
import { css, f, styled } from "library/styled"
import { useCombinedRefs } from "library/useCombinedRefs"
import { use, useEffect, useRef, useState } from "react"

export function CarouselBackgroundVideo({
	playbackId,
	videoBlurUrl,
	videoAspectRatio,
	videoDuration,
	play = true,
	muted = true,
	minResolution = "480p",
	maxResolution,
	className,
	loop,
	ref: containerRef,
	videoRef: externalVideoRef,
	onEnded,
	onTimeUpdate,
	onLoadedMetadata,
	safariOptimized = false,
	eager = false,
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
	/**
	 * maximum resolution to play the video at — caps ABR so small/background
	 * videos don't climb to high rungs (decode cost matters with many videos,
	 * especially on Safari)
	 */
	maxResolution?: "480p" | "540p" | "720p" | "1080p" | "1440p" | "2160p"
	loop?: boolean
	className?: string
	ref?: React.Ref<HTMLDivElement>
	/**
	 * exposes the underlying `<video>` element, e.g. to seek `currentTime` from a custom scrubber
	 */
	videoRef?: React.Ref<HTMLVideoElement>
	/**
	 * use safari-optimized loading strategy (immediate load with metadata preload)
	 * @default false
	 * recommended for carousel/preview videos
	 */
	safariOptimized?: boolean
	/**
	 * load the video immediately on mount, bypassing the lazy intersection observer.
	 * more aggressive than lazy loading — use when the video is above the fold or must
	 * be ready the moment it appears.
	 * @default false
	 */
	eager?: boolean
	// other video props
	onEnded?: (e?: React.SyntheticEvent<HTMLVideoElement, Event>) => void
	onTimeUpdate?: (currentTime: number, duration: number) => void
	onLoadedMetadata?: (duration: number) => void
}) {
	const video = useRef<HTMLVideoElement>(null)
	const combinedVideoRef = useCombinedRefs(externalVideoRef, video)
	const placeholderRef = useRef<HTMLDivElement>(null)
	const [playbackFailure, setPlaybackFailure] = useState<{
		videoId: string
	}>()
	const { innerWidth } = use(ScreenContext)
	const posterSize = Math.min(
		1920,
		Math.max(300, Math.round(innerWidth / 100) * 100),
	)
	const [isSafari, setIsSafari] = useState(false)
	useEffect(() => {
		setIsSafari(browserData.isSafari === true)
	}, [])
	const useSafariOptimization = safariOptimized && isSafari

	// This state now ONLY controls if the <MainVideo> component is rendered.
	const [shouldRenderVideo, setShouldRenderVideo] = useState(
		useSafariOptimization || eager,
	)

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

	/**
	 * This effect handles rendering the video component,
	 * either immediately on Safari or lazily on others.
	 */
	useEffect(() => {
		if (useSafariOptimization || eager) {
			setShouldRenderVideo(true)
			return
		}

		// use an intersection observer to watch for when the element is on screen, and trigger the video load
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
	}, [useSafariOptimization, eager])

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
					ref={combinedVideoRef}
					src={
						playbackFailure || !playbackId
							? undefined
							: `https://stream.mux.com/${playbackId}.m3u8?min_resolution=${minResolution}${
									maxResolution ? `&max_resolution=${maxResolution}` : ""
								}`
					}
					preload="auto"
					muted={muted}
					playsInline
					loop={loop}
					poster={
						playbackFailure
							? `https://image.mux.com/${playbackId}/thumbnail.webp?time=${videoDuration}&width=${posterSize}`
							: `https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=${posterSize}`
					}
					streamType="on-demand"
					style={{ opacity: videoReady ? 1 : 0 }}
					onCanPlay={() => setVideoReady(true)}
					onEnded={onEnded}
					onTimeUpdate={handleTimeUpdate}
					onLoadedMetadata={handleLoadedMetadata}
				/>
			)}
		</Container>
	)
}

const Container = styled("div", [
	{
		"@layer": {
			[library]: f.responsive(css`
				position: relative;
				isolation: isolate;
				overflow: clip;
			`),
		},
	},
])

const MainVideo = styled(MuxVideo, [
	{
		"@layer": {
			[library]: f.responsive(css`
				position: absolute;
				inset: 0;
				width: 100%;
				height: 100%;
				display: block;
				object-fit: cover;
				object-position: center;
				transition: opacity 0.2s ease-in-out;
			`),
		},
	},
])

const PlaceholderDiv = styled("div", [
	{
		"@layer": {
			[library]: f.responsive(css`
				position: absolute;
				inset: 0;
				width: 100%;
				height: 100%;
				background-size: cover;
				background-position: center;
			`),
		},
	},
])
