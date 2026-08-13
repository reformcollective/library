import MuxVideo from "@mux/mux-video-react"
import { browserData } from "library/deviceDetection"
import { library } from "library/layers.css"
import { ScreenContext } from "library/ScreenContext"
import { EagerImages } from "library/StaticImage"
import type { SanityImageData } from "library/sanity/SanityImage"
import { css, f, styled } from "library/styled"
import UniversalImage from "library/UniversalImage"
import { useCombinedRefs } from "library/useCombinedRefs"
import type { StaticImageData } from "next/image"
import { use, useEffect, useRef, useState } from "react"

export function CarouselBackgroundVideo({
	playbackId,
	videoBlurUrl,
	videoAspectRatio,
	videoDuration,
	poster,
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
	onPlaying,
	safariOptimized = false,
	eager = false,
	initialBandwidthEstimateKbps,
	initialEstimateSegments,
	minPreloadSegments,
}: {
	/**
	 * asset metadata from sanity
	 */
	playbackId?: string
	videoBlurUrl?: string
	videoAspectRatio?: string
	videoDuration?: number
	/**
	 * optional poster image (local or from Sanity) shown in place of the
	 * default Mux thumbnail, both as the persistent placeholder and while
	 * the video itself is loading
	 */
	poster?: SanityImageData<"false"> | StaticImageData
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
	/**
	 * bandwidth (in kbps) hls.js should assume before it has measured anything.
	 * only affects browsers on the MSE path (chrome/firefox), not safari's native HLS.
	 * hls.js defaults to 500kbps, which makes it open on the lowest rendition — visibly
	 * blurry for the first few seconds on a large video. raise this to start sharp.
	 */
	initialBandwidthEstimateKbps?: number
	/**
	 * hold the initial bandwidth estimate for this many segments before trusting measured
	 * bandwidth, so one fast small segment doesn't immediately drag the estimate around
	 */
	initialEstimateSegments?: number
	/**
	 * wait until this many segments are buffered before playback advances.
	 * note this works by zeroing `playbackRate`, so avoid it where `onPlaying` drives
	 * a timer or animation that has to stay in sync with real playback.
	 */
	minPreloadSegments?: number
	// other video props
	onEnded?: (e?: React.SyntheticEvent<HTMLVideoElement, Event>) => void
	onTimeUpdate?: (currentTime: number, duration: number) => void
	onLoadedMetadata?: (duration: number) => void
	/**
	 * fires when playback actually begins producing frames (not just when `play()`
	 * is requested) — the right anchor point for starting a timer/animation that
	 * needs to stay in sync with the video's real start
	 */
	onPlaying?: () => void
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
	// starts false regardless of `eager`/safari-optimization so the server-rendered
	// HTML never contains the <mux-video> custom element — it upgrades itself on parse,
	// before React's hydration diff runs on that node, causing a hydration mismatch if
	// it's present from the first render. the effect below flips this to true immediately
	// after mount when eager/safari-optimized, so the visual delay is imperceptible.
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

		let retryTimeout: ReturnType<typeof setTimeout>
		let cancelled = false

		const fail = () => {
			cancelled = true
			clearTimeout(retryTimeout)
			if (playbackId) setPlaybackFailure({ videoId: playbackId })
			onEnded?.()
		}

		// a rejected play() can be a real failure, or just a timing artifact from
		// calling play() before the element has buffered enough. we can't tell
		// which without trying, so keep retrying on a short interval until it
		// succeeds or this effect is cleaned up (play/prop change, unmount) —
		// mirrors the retry loop TestimonialCard drives directly on its <video>
		// element, which never gets stuck the way a one-shot `canplay` listener does.
		// a genuine failure (bad src, network error) surfaces via the element's
		// `error` event below rather than via play() rejection.
		const attemptPlay = () => {
			if (cancelled) return
			videoEl.play().catch(() => {
				if (cancelled) return
				retryTimeout = setTimeout(attemptPlay, 250)
			})
		}

		videoEl.addEventListener("error", fail)
		attemptPlay()

		return () => {
			cancelled = true
			clearTimeout(retryTimeout)
			videoEl.removeEventListener("error", fail)
		}
	}, [play, shouldRenderVideo, playbackFailure, playbackId, onEnded])

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

	let posterElement: React.ReactNode = null
	if (poster && "src" in poster) {
		posterElement = <PosterImage src={poster} alt="" />
	} else if (poster) {
		posterElement = <PosterImage src={poster} alt="" />
	}
	if (posterElement) {
		posterElement = <EagerImages>{posterElement}</EagerImages>
	}

	return (
		<Container
			ref={containerRef}
			className={className}
			style={{
				aspectRatio: videoAspectRatio,
				// we'll ideally only see this on really slow networks
				// it's small and will have weird colors, but it's better than nothing
				backgroundImage:
					!poster && videoBlurUrl ? `url('${videoBlurUrl}')` : undefined,
			}}
		>
			{/* Poster stays mounted underneath the video for the element's whole life, so we never
			    expose the bare container: it covers the gap before the video can play (no black
			    flash) and reappears if iOS evicts a paused offscreen frame (video not "missing"
			    on scroll-back). */}
			<PlaceholderDiv
				ref={placeholderRef}
				style={{
					backgroundImage:
						!poster && playbackId
							? `url(https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=${posterSize})`
							: undefined,
				}}
			>
				{posterElement}
			</PlaceholderDiv>
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
						poster
							? undefined
							: playbackFailure
								? `https://image.mux.com/${playbackId}/thumbnail.webp?time=${videoDuration}&width=${posterSize}`
								: `https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=${posterSize}`
					}
					streamType="on-demand"
					initialBandwidthEstimateKbps={initialBandwidthEstimateKbps}
					initialEstimateSegments={initialEstimateSegments}
					minPreloadSegments={minPreloadSegments}
					style={{ opacity: videoReady ? 1 : 0 }}
					onCanPlay={() => setVideoReady(true)}
					onEnded={onEnded}
					onTimeUpdate={handleTimeUpdate}
					onLoadedMetadata={handleLoadedMetadata}
					onPlaying={onPlaying}
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

const PosterImage = styled(UniversalImage, [
	{
		"@layer": {
			[library]: f.responsive(css`
				position: absolute;
				inset: 0;
				width: 100% !important;
				height: 100% !important;
				aspect-ratio: unset !important;
				object-fit: cover;
				object-position: center;
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
