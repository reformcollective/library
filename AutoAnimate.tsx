import { usePrevious, useThrottle } from "ahooks"
import { gsap } from "gsap"
import { useLayoutEffect, useRef } from "react"
import styled from "styled-components"

export default function AutoAnimate({
  children,
  duration = 1,
  skipFirstAnimation = true,
}: {
  children: React.ReactNode
  duration?: number
  skipFirstAnimation?: boolean
}) {
  const currentTime = useThrottle(children, {
    wait: duration * 1100,
  })
  const defaultValue = skipFirstAnimation ? currentTime : undefined
  const lastTime = usePrevious(currentTime) ?? defaultValue

  const previous = useRef<HTMLDivElement | null>(null)
  const current = useRef<HTMLDivElement | null>(null)
  const firstRender = useRef(true)

  useLayoutEffect(() => {
    if (firstRender.current && skipFirstAnimation) {
      firstRender.current = false
      return
    }

    gsap.fromTo(
      previous.current,
      {
        yPercent: 0,
      },
      {
        yPercent: -100,
        ease: "power3.inOut",
        duration,
      },
    )
    gsap.fromTo(
      current.current,
      {
        yPercent: 100,
      },
      {
        yPercent: 0,
        ease: "power3.inOut",
        duration,
      },
    )
  }, [lastTime, currentTime, duration, skipFirstAnimation])

  return (
    <Wrapper>
      <Previous ref={previous}>{lastTime}</Previous>
      <div ref={current}>{currentTime}</div>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  overflow: hidden;
  position: relative;
`

const Previous = styled.div`
  position: absolute;
`
