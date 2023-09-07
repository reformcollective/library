import { useDeepCompareLayoutEffect, usePrevious, useThrottle } from "ahooks"
import { gsap } from "gsap"
import { useRef } from "react"
import styled from "styled-components"

import useAnimation from "./useAnimation"

const extractKey = (item: unknown): string => {
  if (
    typeof item === "object" &&
    item !== null &&
    "key" in item &&
    typeof item.key === "string"
  ) {
    return item.key
  }
  if (typeof item === "object" && item !== null)
    throw new Error("Element passed to AutoAnimate must have a key!")
  return String(item)
}

export default function AutoAnimate({
  children,
  duration = 1,
  skipFirstAnimation = true,
  parameters,
}: {
  children: React.ReactNode
  duration?: number
  skipFirstAnimation?: boolean
  parameters?: GSAPTweenVars
}) {
  const currentTime = useThrottle(children, {
    wait: duration * 1100,
  })
  const defaultValue = skipFirstAnimation ? currentTime : undefined
  const lastTime = usePrevious(currentTime) ?? defaultValue

  const previous = useRef<HTMLDivElement | null>(null)
  const current = useRef<HTMLDivElement | null>(null)
  const firstRender = useRef(true)

  useAnimation(
    () => {
      if (firstRender.current && skipFirstAnimation) {
        firstRender.current = false
        return
      }

      gsap.to(previous.current, {
        yPercent: -100,
        ease: "power3.inOut",
        duration,
        ...parameters,
      })
      gsap.from(current.current, {
        yPercent: 100,
        ease: "power3.inOut",
        ...parameters,
        duration,
      })
    },
    [duration, parameters, skipFirstAnimation],
    {
      extraDeps: [currentTime, lastTime],
      effect: useDeepCompareLayoutEffect,
    },
  )

  const keysMatch = extractKey(currentTime) === extractKey(lastTime)

  return (
    <Wrapper>
      <div
        ref={previous}
        key={keysMatch ? Math.random() : extractKey(lastTime)}
      >
        {lastTime}
      </div>
      <div ref={current} key={extractKey(currentTime)}>
        {currentTime}
      </div>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  overflow: hidden;
  position: relative;
  display: grid;
  grid-template: 1fr / 1fr;

  > * {
    grid-area: 1 / 1 / 2 / 2;
    display: grid;
    align-items: center;

    /* text very commonly overflows its bounds on the bottom in letters like g */
    padding-bottom: 0.1em;
  }
`
