import { useRef } from "react"

import gsap from "gsap"
import styled from "styled-components"

import useAnimation from "library/useAnimation"
import media from "styles/media"

interface MarqueeProps {
  children: React.ReactNode
  className?: string
  triggerEnd?: string
  right?: boolean
}

export default function ScrubMarquee({
  children,
  className = "",
  right = false,
  triggerEnd = "bottom top",
}: MarqueeProps) {
  const marquee = useRef<HTMLDivElement>(null)

  useAnimation(() => {
    if (marquee.current && triggerEnd) {
      gsap.fromTo(marquee.current, {
          x: right ? "-100vw" : 0,
        },
        {
          x: right ? 0 : "-100vw",
          ease: "linear",
          scrollTrigger: {
            trigger: marquee.current,
            start: "top bottom",
            end: triggerEnd,
            scrub: true,
          },
        })
    }
  }, [right, triggerEnd])

  return (
    <MarqueeWrapper ref={marquee} className={className}>
      {children}
    </MarqueeWrapper>
  )
}

const MarqueeWrapper = styled.div`
  position: relative;
  display: grid;
  will-change: transform;
  width: 200vw;
  left: 50%;
  transform: translateX(-50%);
  white-space: pre;

  & > div {
    white-space: pre;
    will-change: transform;
    position: absolute;
  }

  & > div:first-child {
    position: relative;
  }

  ${media.tablet} {
    left: 20%;
  }

  ${media.mobile} {
    left: 0;
  }
`
