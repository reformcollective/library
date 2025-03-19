"use client"

import { ScrollTrigger } from "gsap/all"
import { useRef, useState, type ReactNode, type Ref } from "react"

import { useAnimation } from "./useAnimation"
import useCombinedRefs from "./useCombinedRefs"
import { useRafInterval } from "ahooks"

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
	const videoRef = useCombinedRefs(ref)
	const hasStartedLoading = useRef(false)

	const { result: trigger } = useAnimation(() => {
		return ScrollTrigger.create({
			trigger: videoRef.current,
			start: "top-=200 bottom",
			end: "bottom+=200 top",
			onEnter: () => setShowVideo(true),
			onEnterBack: () => setShowVideo(true),
		})
	}, [videoRef])

	/**
	 * if the video starts off screen and animates in, the trigger might not catch it
	 * so we need to refresh the trigger every couple frames
	 */
	useRafInterval(() => {
		if (!showVideo) trigger?.refresh()
	}, 100)

	return (
		<video
			{...props}
			ref={videoRef}
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
