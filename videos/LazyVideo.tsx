import { ScrollTrigger } from "gsap/all"
import { type ReactNode, type Ref, useRef, useState } from "react"
import { usePreloader } from "../link/usePreloader"
import { useAnimation } from "../useAnimation"
import { useCombinedRefs } from "../useCombinedRefs"

export function LazyVideo({
	autoPlay,
	loop,
	muted,
	onLoad,
	ref,
	children,
	...props
}: {
	/**
	 * specify a poster image
	 */
	poster?: string
	/**
	 * should the video play automatically when loaded?
	 * this will mute the video
	 */
	autoPlay?: boolean
	/**
	 * should we mute the video?
	 * this option is also implied by autoPlay
	 */
	muted?: boolean
	/**
	 * should the video repeat?
	 */
	loop?: boolean
	/**
	 * callback when the first frame of the video has loaded
	 */
	onLoad?: (video: HTMLVideoElement) => void
	children?: ReactNode
	className?: string
	style?: React.CSSProperties
	ref?: Ref<HTMLVideoElement>
}) {
	const [showVideo, setShowVideo] = useState(false)
	const videoRef = useRef<HTMLVideoElement>(null)
	const hasStartedLoading = useRef(false)
	const { completed } = usePreloader()

	useAnimation(
		() => {
			if (!completed) return
			if (showVideo) return

			const show = (self: ScrollTrigger) => {
				if (!videoRef.current) return

				if (self.start < 0 || self.end < 0) {
					// video not loaded
				} else {
					setShowVideo(true)
				}
			}

			// for whatever reason, gsap does a very bad job of tracking videos
			// when the don't have a source. so I'm computing the values
			// manually here, which is slightly less efficient but works much better
			ScrollTrigger.create({
				trigger: videoRef.current,
				start: () => {
					if (!videoRef.current) return Number.NEGATIVE_INFINITY
					const bounds = videoRef.current.getBoundingClientRect()
					const scroll = window.scrollY
					return scroll - window.innerHeight + bounds.top - 200
				},
				end: () => {
					if (!videoRef.current) return Number.NEGATIVE_INFINITY
					const bounds = videoRef.current.getBoundingClientRect()
					return `+=${bounds.height + 400}`
				},
				onEnter: show,
				onEnterBack: show,
			})
		},
		[completed, showVideo],
		{ recreateOnResize: true },
	)

	return (
		<video
			{...props}
			ref={useCombinedRefs(videoRef, ref)}
			autoPlay={autoPlay}
			muted={muted || autoPlay}
			loop={loop}
			playsInline
			onLoadedData={(e) => {
				if (!hasStartedLoading.current) {
					const video = e.target as HTMLVideoElement
					hasStartedLoading.current = true
					onLoad?.(video)
				}
			}}
		>
			{showVideo && children}
		</video>
	)
}
