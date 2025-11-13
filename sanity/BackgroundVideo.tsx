import MuxVideo from "@mux/mux-video-react"
import { browserData } from "library/deviceDetection"
import { library } from "library/layers.css"
import { ScreenContext } from "library/ScreenContext"
import { css, f, styled } from "library/styled/alpha"
import SanityUniversalImage from "library/UniversalImage"
import { use, useEffect, useRef, useState } from "react"
import type {
	internalGroqTypeReferenceTo,
	SanityImageCrop,
	SanityImageHotspot,
} from "@/sanity.types"
import type { AssetMeta } from "./assetMetadata"

type SanityPosterImage = {
	asset?: {
		_ref: string
		_type: "reference"
		_weak?: boolean
		[internalGroqTypeReferenceTo]?: "sanity.imageAsset"
	}
	media?: unknown
	hotspot?: SanityImageHotspot
	crop?: SanityImageCrop
	alt?: string
	cropType?: "sanity"
	willHaveAlt?: "true"
	data?: AssetMeta
}

export function BackgroundVideo({
	playbackId,
	videoBlurUrl,
	videoAspectRatio,
	videoDuration,
	eager,
	play = true,
	muted = true,
	minResolution = "480p",
	className,
	loop,
	ref: containerRef,
	onEnded,
	onTimeUpdate,
	onLoadedMetadata,
	posterOverride,
}: {
	/**
	 * asset metadata from sanity
	 */
	playbackId?: string
	videoBlurUrl?: string
	videoAspectRatio?: string
	videoDuration?: number
	/**
	 * should the video not show a blur at all if possible? (this is more aggressive than lazy loading)
	 * @default false
	 */

	eager?: boolean

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
	 * a Sanity Image object. If provided, this will override the default
	 * "video-as-poster" behavior and use a simpler, more robust image poster. useful for slower networks.
	 */
	posterOverride?: SanityPosterImage
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
	const [loadVideo, setLoadVideo] = useState(eager ?? false)
	const [videoCanPlay, setVideoCanPlay] = useState(true)

	useEffect(() => {
		if (loadVideo && video.current && browserData.isSafari) {
			video.current.load()
		}
	}, [loadVideo])

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
		if (playbackFailure || !loadVideo) return

		const videoHasFinished = video.current?.ended

		if (playbackId && !videoHasFinished)
			// we never want to interrupt a play call with another play call
			// so wait for any previous play call to finish before starting a new one
			videoPlayPromise.current.then(() => {
				if (video.current)
					videoPlayPromise.current = video.current
						?.play()
						.then(() => {
							if (!play) video.current?.pause()
						})
						.catch(() => {
							if (playbackId) {
								setPlaybackFailure({ videoId: playbackId })
							}
							onEnded?.()
						})
			})
	}, [play, loadVideo, playbackId, playbackFailure, onEnded])

	/**
	 * lazy load
	 */
	useEffect(() => {
		if (eager) {
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
		const elementToObserve = placeholderRef.current ?? video.current
		if (elementToObserve) observer.observe(elementToObserve)
		return () => observer.disconnect()
	}, [eager])

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

	// new, simpler path for when a custom poster is provided (optional)
	if (posterOverride?.asset) {
		return (
			<Container
				ref={containerRef}
				className={className}
				style={{
					aspectRatio: videoAspectRatio,
				}}
			>
				<PosterImage
					style={{ opacity: videoCanPlay ? 1 : 0 }}
					src={{
						asset: { _ref: posterOverride.asset._ref },
						alt: posterOverride.alt as string,
					}}
					alt={posterOverride.alt as string}
					width={1920}
					height={1080}
					loading="eager"
				/>
				{loadVideo && (
					<MainVideo
						ref={video}
						src={
							playbackFailure || !playbackId
								? undefined
								: `https://stream.mux.com/${playbackId}.m3u8?min_resolution=${minResolution}`
						}
						preload="auto"
						muted={muted}
						playsInline
						loop={loop}
						streamType="on-demand"
						onCanPlay={() => setVideoCanPlay(false)}
						onEnded={onEnded}
						onTimeUpdate={handleTimeUpdate}
						onLoadedMetadata={handleLoadedMetadata}
					/>
				)}

				{!loadVideo && <div ref={placeholderRef} style={{ height: "1px" }} />}
			</Container>
		)
	}

	// original "video-as-poster" logic for backward compatibility
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
			<PosterVideo
				// mux thumbnails will have different colors than the video itself, so we can't seamlessly
				// switch between the two without some extra effort. we'll rely on the first frame for this
				// instead of using a thumbnail. This video is smaller so we get a fast poster load
				data-poster
				src={
					playbackId
						? `https://stream.mux.com/${playbackId}.m3u8?max_resolution=720p`
						: undefined
				}
				preload="metadata"
				muted={muted}
				playsInline
				style={{ opacity: videoCanPlay ? 1 : 0 }}
			/>
			{/* this is to combat a safari rendering bug where the video doesn't render properly if being lazy loaded or dynamically loaded. */}
			{loadVideo ? (
				<MainVideo
					key={`${playbackId}-loaded`}
					ref={video}
					src={
						playbackFailure || !playbackId
							? undefined
							: `https://stream.mux.com/${playbackId}.m3u8?min_resolution=${minResolution}`
					}
					preload="auto"
					onCanPlay={() => setVideoCanPlay(false)}
					muted={muted}
					playsInline
					loop={loop}
					poster={
						playbackFailure
							? `https://image.mux.com/${playbackId}/thumbnail.webp?time=${videoDuration}&width=${posterSize}`
							: undefined
					}
					streamType="on-demand"
					onEnded={onEnded}
					onTimeUpdate={handleTimeUpdate}
					onLoadedMetadata={handleLoadedMetadata}
				/>
			) : (
				<MainVideo
					key={`${playbackId}-placeholder`}
					ref={video}
					preload="metadata"
					onCanPlay={() => setVideoCanPlay(false)}
					muted={muted}
					playsInline
					loop={loop}
					streamType="on-demand"
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
				width: 100%;
				height: 100%;
				display: block;
				object-fit: cover;
				object-position: center;
			`),
		},
	},
])

const PosterVideo = styled(MainVideo, [
	{
		"@layer": {
			[library]: f.responsive(css`
				position: absolute;
				transition: opacity 0.2s ease-in-out;
				pointer-events: none;
			`),
		},
	},
])

const PosterImage = styled(SanityUniversalImage, [
	{
		"@layer": {
			[library]: f.responsive(css`
				position: absolute;
				inset: 0;
				width: 100%;
				height: 100%;
				object-fit: cover;
				object-position: center;
			`),
		},
	},
])
