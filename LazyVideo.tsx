import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, useState } from "react"

import useAnimation from "./useAnimation"

type Props = {
  poster: string
  className?: string
  style?: React.CSSProperties
  forwardRef?: React.RefObject<HTMLVideoElement>
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
  ...props
}: Props) => {
  const [showVideo, setShowVideo] = useState(false)
  const alternateRef = useRef<HTMLVideoElement>(null)
  const refToUse = forwardRef ?? alternateRef

  useAnimation(() => {
    ScrollTrigger.create({
      trigger: refToUse.current,
      start: "top bottom",
      onEnter: () => setShowVideo(true),
    })
  }, [refToUse])

  return showVideo ? (
    <video
      {...props}
      src={sourceMP4}
      poster={poster}
      autoPlay
      muted
      loop
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
