import { useEffect } from "react"
import Lazy from "vanilla-lazyload"

import { isBrowser } from "./functions"

const loader = isBrowser() ? new Lazy() : undefined

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
  className,
  poster,
  style,
  sourceMP4,
  sourceWEBM,
  forwardRef,
}: Props) => {
  useEffect(() => {
    loader?.update()
  }, [])

  return (
    <video
      style={style}
      className={`lazy ${className ?? ""}`}
      data-src={sourceMP4}
      data-poster={poster}
      autoPlay
      muted
      loop
      playsInline
      ref={forwardRef}
    >
      {sourceWEBM && <source src={sourceWEBM} type="video/webm" />}
      {sourceMP4 && <source src={sourceMP4} type="video/mp4" />}
    </video>
  )
}
