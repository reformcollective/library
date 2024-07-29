import { useRafInterval } from "ahooks"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, useState } from "react"

import useAnimation from "./useAnimation"

type Props = {
	poster: string
	className?: string
	style?: React.CSSProperties
	forwardRef?: React.RefObject<HTMLVideoElement>
	contextMenu?: boolean
	loop?: boolean
	autoPlay?: boolean
} & (
	| { sourceMP4: string; sourceWEBM?: string }
	| { sourceMP4?: string; sourceWEBM: string }
)

export function LazyVideo({
	poster,
	sourceMP4,
	sourceWEBM,
	forwardRef,
	contextMenu = true,
	loop = true,
	autoPlay = true,
	...props
}: Props) {
	const [showVideo, setShowVideo] = useState(false)
	const alternateRef = useRef<HTMLVideoElement>(null)
	const refToUse = forwardRef ?? alternateRef

	const trigger = useAnimation(() => {
		return ScrollTrigger.create({
			trigger: refToUse.current,
			start: "top bottom",
			onEnter: () => setShowVideo(true),
		})
	}, [refToUse])

	/**
	 * if the video starts off screen and animates in, the trigger might not catch it
	 * so we need to refresh the trigger every couple frames
	 */
	useRafInterval(() => {
		if (!showVideo) trigger?.refresh()
	}, 32)

	return (
		<video
			{...props}
			poster={poster}
			autoPlay={autoPlay}
			muted
			loop={loop}
			playsInline
			onContextMenu={(e) => {
				!contextMenu && e.preventDefault()
			}}
			ref={refToUse}
		>
			{showVideo && (
				<>
					{sourceWEBM && <source src={sourceWEBM} type="video/webm" />}
					{sourceMP4 && <source src={sourceMP4} type="video/mp4" />}
				</>
			)}
		</video>
	)
}
