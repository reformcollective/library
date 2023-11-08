import { useRafInterval } from "ahooks"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, useState } from "react"

import useAnimation from "./useAnimation"

type Props = {
  poster: string
  className?: string
  style?: React.CSSProperties
  forwardRef?: React.RefObject<HTMLVideoElement>
  loop?: boolean
  autoPlay?: boolean
  sourceMP4Mobile?: string
  sourceWEBMMobile?: string
  mobileBreakpoint?: number
} & (
  | { sourceMP4: string; sourceWEBM?: string }
  | { sourceMP4?: string; sourceWEBM: string }
)

export const LazyVideo = ({
  poster,
  sourceMP4,
  sourceWEBM,
  sourceMP4Mobile,
  sourceWEBMMobile,
  mobileBreakpoint,
  forwardRef,
  loop = true,
  autoPlay = true,
  ...props
}: Props) => {
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

  return showVideo ? (
    <video
      {...props}
      src={sourceMP4}
      poster={poster}
      autoPlay={autoPlay}
      muted
      loop={loop}
      playsInline
      ref={refToUse}
    >
      {sourceWEBMMobile && (
        <source
          src={sourceWEBMMobile}
          type="video/webm"
          media={`(max-width:${mobileBreakpoint}px)`}
        />
      )}
      {sourceMP4Mobile && (
        <source
          src={sourceMP4Mobile}
          type="video/mp4"
          media={`(max-width:${mobileBreakpoint}px)`}
        />
      )}
      {sourceWEBM && <source src={sourceWEBM} type="video/webm" />}
      {sourceMP4 && <source src={sourceMP4} type="video/mp4" />}
    </video>
  ) : (
    <video {...props} poster={poster} muted ref={refToUse} />
  )
}
