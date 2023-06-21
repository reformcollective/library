import gsap from "gsap/all"
import useCanHover from "library/canHover"
import { usePinType } from "library/Scroll"
import useAnimation from "library/useAnimation"
import { useEffect, useState } from "react"
import styled, { css } from "styled-components"

import { getVH } from "./viewportUtils"

interface SideScrollerProps {
  children: React.ReactNode
  /**
   * the easing to use for the side-to-side animation
   */
  ease?: string
  /**
   * allows the side scroller to be scrolled manually on touchscreen devices
   */
  disableTouchscreenMode?: boolean

  setContainerAnimation?: (animation: gsap.core.Tween) => void
  /**
   * allows adds the capability to add the timeline to another animation so that the containerAnimation property can be set on that scrolltrigger.
   */
}

export default function SideScroller({
  children,
  ease = "none",
  disableTouchscreenMode = false,
  setContainerAnimation = () => {},
}: SideScrollerProps) {
  const [wrapperEl, setWrapperEl] = useState<HTMLElement | null>(null)
  const [innerEl, setInnerEl] = useState<HTMLDivElement | null>(null)

  const [widthOfChildren, setWidthOfChildren] = useState(0)
  const [pinAmount, setPinAmount] = useState(0)

  const pinType = usePinType()
  const touchscreenMode = !useCanHover() && !disableTouchscreenMode

  /**
   * track the width of the children and calculate the amount of pinning needed
   */
  useEffect(() => {
    const onResize = () => {
      if (innerEl) {
        gsap.set(innerEl, { clearProps: "all" })
        const newInnerWidth = innerEl.getBoundingClientRect().width
        setWidthOfChildren(newInnerWidth)

        const multiplyBy = newInnerWidth / window.innerWidth
        const height = getVH(100) * multiplyBy

        setPinAmount(height)
      }
    }
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [innerEl])

  /**
   * animate the children
   */
  useAnimation(() => {
    if (touchscreenMode) return

    if (wrapperEl && innerEl && widthOfChildren && pinAmount) {
      const x = -(widthOfChildren > window.innerWidth
        ? widthOfChildren - window.innerWidth
        : 0)

      const tween = gsap.to(innerEl, {
        x,
        ease,
        scrollTrigger: {
          trigger: wrapperEl,
          start: "top top",
          end: "bottom bottom",
          pin: innerEl,
          pinType,
          pinSpacing: false,
          scrub: true,
          anticipatePin: 1,
        },
      })

      if (setContainerAnimation) {
        setContainerAnimation(tween)
      }

      // it's important that this trigger is refreshed immediately when resized
      // by default the refresh is delayed until scroll stops
      const onResize = () => {
        tween.scrollTrigger?.refresh()
      }
      window.addEventListener("resize", onResize)
      return () => window.removeEventListener("resize", onResize)
    }
  }, [
    ease,
    innerEl,
    pinAmount,
    pinType,
    touchscreenMode,
    widthOfChildren,
    wrapperEl,
    setContainerAnimation,
  ])

  return (
    <Wrapper
      ref={setWrapperEl}
      height={pinAmount}
      touchscreenMode={touchscreenMode}
    >
      <Inner ref={setInnerEl} touchscreenMode={touchscreenMode}>
        {children}
      </Inner>
    </Wrapper>
  )
}

const Wrapper = styled.section<{ height: number; touchscreenMode: boolean }>`
  position: relative;
  overflow: hidden;
  width: 100%;
  height: ${props => props.height}px;

  ${({ touchscreenMode }) =>
    touchscreenMode &&
    css`
      height: fit-content;
      overflow-x: auto;
    `}
`

const Inner = styled.div<{
  touchscreenMode: boolean
}>`
  position: absolute;
  width: fit-content;
  top: 0;
  left: 0;

  > div {
    width: fit-content;
  }

  ${({ touchscreenMode }) =>
    touchscreenMode &&
    css`
      width: fit-content;
      height: fit-content;
    `}
`
