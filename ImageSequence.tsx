import gsap from "gsap"
import fullyResponsive from "library/fullyResponsive"
import loader, { transitionAwaitPromise } from "library/Loader"
import { useCallback, useEffect, useRef, useState } from "react"
import styled, { css } from "styled-components"

interface SequenceProps {
  className?: string
  length: number
  folder: string
}

type PropsScroll = SequenceProps & {
  type: "scroll"
  trigger: HTMLElement | string | null
  endVal?: string
  ease?: string

  frame?: never
  duration?: never
}

type PropsAuto = SequenceProps & {
  type: "auto"
  ease?: string

  frame?: never
  trigger?: never
  endVal?: never
  duration?: number
}

type PropsManual = SequenceProps & {
  type: "manual"
  frame: number

  trigger?: never
  endVal?: never
  duration?: never
  ease?: never
}

export default function ImageSequence({
  className = "",
  length,
  folder,
  trigger,
  endVal,
  frame,
  ease,
  duration,
}: PropsAuto | PropsScroll | PropsManual) {
  const [sequenceData] = useState({
    frame: 0,
    images: [] as HTMLImageElement[],
    ease,
  })
  const [canvasWidth, setWidth] = useState(0)
  const [canvasHeight, setHeight] = useState(0)

  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)

  /**
   * render the currently selected frame
   */
  const render = () => {
    const imgToRender = sequenceData.images[sequenceData.frame]

    if (
      canvasEl &&
      context &&
      imgToRender instanceof HTMLImageElement &&
      imgToRender.complete
    ) {
      const { width, height } = imgToRender
      // setting the width here is important, otherwise safari freaks the FUCK out
      canvasEl.width = width
      canvasEl.height = height
      context.clearRect(0, 0, width, height)
      context.drawImage(imgToRender, 0, 0, width, height)
    }
  }

  const latestRender = useRef<VoidFunction>(render)
  latestRender.current = render

  /**
   * Given an image source, create an image and add it to the sequenceData.images array
   * at the given index.
   * @param src The image source
   * @param index The index to add the image to
   */
  const createImage = useCallback(
    (src: string, index: number) => {
      // if the image already exists, don't load it again
      if (sequenceData.images[index]) return
      const img = new Image()
      img.src = src
      sequenceData.images[index] = img

      const onImageLoad = () => {
        setWidth(width => Math.max(width, img.naturalWidth))
        setHeight(height => Math.max(height, img.naturalHeight))
        requestAnimationFrame(() => {
          latestRender.current()
        })
      }

      img.addEventListener("load", onImageLoad)
      return () => img.removeEventListener("load", onImageLoad)
    },
    [sequenceData.images]
  )

  /**
   * Preload the images
   */
  useEffect(() => {
    for (let i = 0; i < length; i += 1) {
      const maxLen = length.toString().length
      const imageNumber = i.toString().padStart(maxLen, "0")

      // eslint-disable-next-line no-unsanitized/method
      const prom = import(`images/sequences/${folder}/${imageNumber}.webp`)
        .then((image: { default: string }) => {
          return createImage(image.default, i)
        })
        .catch(console.error)

      // if this is an auto sequence, the loader should wait for all images to settle (max 5s)
      if (trigger === undefined && frame === undefined)
        transitionAwaitPromise(prom)
    }
  }, [length, folder, trigger, createImage, frame])

  /**
   * Update the drawing context when the canvas element is created
   */
  useEffect(() => {
    if (canvasEl) setContext(canvasEl.getContext("2d"))
  }, [canvasEl])

  /**
   * Create the timeline and play it when ready
   */
  useEffect(() => {
    if (
      canvasEl &&
      frame === undefined // skip timeline creation if in manual mode
    ) {
      const tl = gsap.timeline({ paused: true })
      tl.fromTo(
        sequenceData,
        {
          frame: 0,
        },
        {
          frame: length - 1,
          snap: "frame",
          duration: duration ?? 3,
          ease: ease ?? "none",
          onUpdate: () => {
            requestAnimationFrame(() => {
              latestRender.current()
            })
          },
          scrollTrigger: trigger
            ? {
                trigger,
                scrub: 0.5,
                start: "top top",
                end: endVal,
              }
            : undefined,
        },
        1
      )

      const onReady = () => {
        Promise.allSettled(sequenceData.images)
          .then(() => {
            return tl.play(0)
          })
          .catch(console.error)
      }

      loader.addEventListener("anyEnd", onReady)
      return () => {
        loader.removeEventListener("anyEnd", onReady)
        tl.revert()
      }
    }
    // if in manual mode, render the frame when it changes
    if (frame !== undefined) {
      sequenceData.frame = frame
      requestAnimationFrame(() => {
        latestRender.current()
      })
    }
  }, [canvasEl, duration, ease, endVal, frame, length, sequenceData, trigger])

  /**
   * change in width or height should trigger a re-render
   */
  useEffect(() => {
    requestAnimationFrame(() => {
      latestRender.current()
    })
  }, [canvasWidth, canvasHeight])

  return (
    <Canvas
      className={className}
      height={canvasHeight}
      width={canvasWidth}
      ref={setCanvasEl}
    />
  )
}

const Canvas = styled.canvas<{ height: number; width: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;

  ${({ height, width }) =>
    fullyResponsive(css`
      height: ${height}px;
      width: ${width}px;
    `)}
`
