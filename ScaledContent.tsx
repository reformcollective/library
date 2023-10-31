import { useEffect, useRef } from "react"
import styled from "styled-components"

/**
 * scales it's content to a certain size while maintaining
 * the borders of the content
 *
 * so a 100x100 div scaled to 50x50 will be 50x50 in the DOM
 */
export default function ScaledContent({
  scale,
  children,
}: {
  scale: number | null | undefined
  children: React.ReactNode
}) {
  const outer = useRef<HTMLDivElement | null>(null)
  const inner = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!outer.current || !inner.current) return
    const update = () => {
      if (!outer.current || !inner.current) return
      const { width, height } = inner.current.getBoundingClientRect()
      outer.current.style.width = `${width}px`
      outer.current.style.height = `${height}px`
    }

    update()

    // use a resize observer to update the size of the outer div
    // when the inner div changes size
    const observer = new ResizeObserver(update)
    observer.observe(inner.current)
  }, [])

  return (
    <Outer ref={outer}>
      <Inner ref={inner} scale={scale ?? 1}>
        {children}
      </Inner>
    </Outer>
  )
}

const Outer = styled.div`
  display: grid;
  place-items: start;
`

const Inner = styled.div<{ scale: number }>`
  transform-origin: top left;
  scale: ${({ scale }) => scale};
`
