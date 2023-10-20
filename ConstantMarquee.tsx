import gsap from "gsap"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import styled from "styled-components"

import { addDebouncedEventListener } from "./functions"

interface MarqueeProps {
  children: React.ReactNode
  timing?: number
  className?: string
  toLeft?: boolean
  /**
   * How much extra buffer should be maintained offscreen?
   */
  buffer?: number
}

export default function ConstantMarquee({
  children,
  timing = 20,
  className = "",
  buffer = 0,
  toLeft = true,
}: MarqueeProps) {
  const marquee = useRef<HTMLDivElement>(null)
  const [array, setArray] = useState<null[]>([null])
  const [hash, setHash] = useState(0)
  const offset = useRef(0)

  useEffect(() => {
    if (marquee.current) {
      const first = marquee.current.children[0]

      const width = first?.clientWidth ?? 0
      offset.current = Math.min(0, offset.current)
      gsap.set(marquee.current.children, {
        x: i => i * width + offset.current,
      })

      gsap.to(marquee.current, {})

      const tween = gsap.to(marquee.current.children, {
        duration: timing,
        ease: "none",
        x: toLeft ? `-=${width}` : `+=${width}`, // move each box 500px to right
        scrollTrigger: {
          trigger: marquee.current,
          start: "top bottom",
          end: "bottom top",
          toggleActions: "play pause resume pause",
        },
        modifiers: {
          x: gsap.utils.unitize((x: number) => {
            if (toLeft) {
              if (x < -width) {
                return x + width * array.length
              }
            } else {
              if (x > width) {
                return x - width * array.length
              }
            }
            return x
          }),
        },
        onComplete: () => {
          tween.invalidate()
          tween.restart()
        },
      })

      return () => {
        if (first instanceof HTMLElement)
          offset.current = parseInt(gsap.getProperty(first, "x").toString(), 10)
      }
    }
  }, [array.length, timing, hash, toLeft])

  useEffect(() => {
    const update = () => {
      if (marquee.current) {
        const width = Math.max(
          ...[...marquee.current.children].map(child => child.clientWidth),
        )

        // number needed to fill width plus some buffer
        const newNumber = Math.ceil((window.innerWidth + buffer) / width) + 1
        if (Number.isFinite(newNumber) && newNumber > 0)
          setArray(Array.from({ length: newNumber }, () => null))
      }
      setHash(p => p + 1)
    }

    update()

    const elementsToObserve = marquee.current?.querySelectorAll("*") ?? []

    const observer = new ResizeObserver(update)
    elementsToObserve.forEach(element => {
      observer.observe(element)
    })
    const remove = addDebouncedEventListener(window, "resize", update, 100)

    return () => {
      remove()
      observer.disconnect()
    }
  }, [buffer, children])

  return (
    <StyledMarquee
      ref={marquee}
      $number={array.length}
      className={className}
      $toLeft={toLeft}
    >
      {/* repeat children NUMBER times */}
      {array.map(() => {
        return <div key={Math.random()}>{children}</div>
      })}
    </StyledMarquee>
  )
}

const StyledMarquee = styled.div<{ $number: number; $toLeft: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: repeat(${({ $number }) => $number}, max-content);

  /* always have a width of 100vw by default */
  width: 100%;
  left: 50%;
  transform: translateX(${({ $toLeft }) => ($toLeft ? "-50%" : "-150%")});

  & > div {
    white-space: pre;
    will-change: transform;
    position: absolute;
  }

  & > div:first-child {
    position: relative;
  }
`
