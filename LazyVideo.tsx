import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, useState } from "react"

import useAnimation from "./useAnimation"

type Props = {
  poster: string
  className?: string
  style?: React.CSSProperties
  forwardRef?: React.RefObject<HTMLVideoElement>
  loop?: boolean
} & (
  | { sourceMP4: string; sourceWEBM?: string }
  | { sourceMP4?: string; sourceWEBM: string }
)

export const LazyVideo = ({
  poster,
  sourceMP4,
  sourceWEBM,
  forwardRef,
  loop = true,
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
      loop={loop}
      playsInline
      ref={refToUse}
    >
      {sourceWEBM && <source src={sourceWEBM} type="video/webm" />}
      {sourceMP4 && <source src={sourceMP4} type="video/mp4" />}
    </video>
  ) : (
    <video {...props} poster={poster} muted ref={refToUse} />
  )
}
