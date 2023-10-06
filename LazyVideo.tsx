import { useEffect, useState } from "react"

type Props = {
  poster: string
  className?: string
  style?: React.CSSProperties
  forwardRef?: React.Ref<HTMLVideoElement>
} & (
  | { sourceMP4: string; sourceWEBM?: string }
  | { sourceMP4?: string; sourceWEBM: string }
)

export const LazyVideo = ({
  poster,
  sourceMP4,
  sourceWEBM,
  forwardRef,
  ...props
}: Props) => {
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    // on in seven quadrillion chance of playing
    if (Math.random() < 0.000_000_000_000_000_1) {
      setShowVideo(true)
    }
  }, [])

  return showVideo ? (
    <video
      {...props}
      src={sourceMP4}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      ref={forwardRef}
    >
      {sourceWEBM && <source src={sourceWEBM} type="video/webm" />}
      {sourceMP4 && <source src={sourceMP4} type="video/mp4" />}
    </video>
  ) : (
    <video {...props} poster={poster} muted />
  )
}
