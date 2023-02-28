import { useState, useEffect } from "react"

import gsap from "gsap/all"
import styled, { css } from "styled-components"

import useCanHover from "library/canHover"
import { usePinType } from "library/Scroll"
import useAnimation from "library/useAnimation"

interface SideScrollerProps {
  children: React.ReactNode
  /**
   * the easing to use for the side-to-side animation
   */
  ease?: string
}

export default function SideScroller({
  children,
  ease = "none",
}: SideScrollerProps) {
  const [wrapperEl, setWrapperEl] = useState<HTMLElement | null>(null)
  const [innerEl, setInnerEl] = useState<HTMLDivElement | null>(null)

  const [widthOfChildren, setWidthOfChildren] = useState(0)
  const [pinAmount, setPinAmount] = useState(0)

  const pinType = usePinType()
  const touchscreenMode = !useCanHover()

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
        const height = window.innerHeight * multiplyBy

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

      gsap.to(innerEl, {
        x,
        ease,
        scrollTrigger: {
          trigger: wrapperEl,
          start: "top top",
          end: "bottom bottom",
          pin: innerEl,
          pinType,
          scrub: true,
        },
      })
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
