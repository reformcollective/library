import { useState, useEffect } from "react"

import gsap from "gsap/all"
import styled, { css } from "styled-components"

import useCanHover from "library/canHover"
import { usePinType } from "library/Scroll"
import useAnimation from "library/useAnimation"

import getVH from "./getVH"

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
}

export default function SideScroller({
  children,
  ease = "none",
  disableTouchscreenMode = false,
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
  ])

  /**
   * translate horizontal scroll events to vertical scroll events
   */
  // useEffect(() => {
  //   if (touchscreenMode || !wrapperEl) return

  //   const onWheel = (event: WheelEvent) => {
  //     if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
  //       event.preventDefault()
  //       window.scrollBy(0, event.deltaX)
  //     }
  //   }

  //   let previousTouch: Touch | undefined
  //   const onTouchStart = (event: TouchEvent) => {
  //     ;[previousTouch] = event.touches
  //   }
  //   const onTouchMove = (event: TouchEvent) => {
  //     if (event.touches.length === 1) {
  //       const touch = event.touches[0]
  //       if (previousTouch && touch) {
  //         const deltaY = touch.clientY - previousTouch.clientY
  //         const deltaX = touch.clientX - previousTouch.clientX
  //         if (Math.abs(deltaX) > Math.abs(deltaY)) {
  //           event.preventDefault()
  //           window.scrollBy(0, -deltaX)
  //         }
  //       }
  //       previousTouch = touch
  //     }
  //   }

  //   wrapperEl.addEventListener("wheel", onWheel, { passive: false })
  //   wrapperEl.addEventListener("touchstart", onTouchStart)
  //   wrapperEl.addEventListener("touchmove", onTouchMove, { passive: false })
  //   return () => {
  //     wrapperEl.removeEventListener("wheel", onWheel)
  //     wrapperEl.removeEventListener("touchstart", onTouchStart)
  //     wrapperEl.removeEventListener("touchmove", onTouchMove)
  //   }
  // }, [touchscreenMode, wrapperEl])

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
