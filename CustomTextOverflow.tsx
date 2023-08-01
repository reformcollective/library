import { useEffect, useRef, useState } from "react"

interface CustomTextOverflowProps {
  /**
   * the text to display
   */
  children: string
  /**
   * the custom ellipsis to display,
   * defaults to "..."
   */
  ellipsis?: string
  /**
   * the number of lines you need
   */
  maxLines?: number
  /**
   * where in the text to place the ellipsis
   * as an index in characters. negative numbers count from the end of the text,
   * and 0 is the very end of the text
   */
  truncatePosition?: number
}

/**
 * given a number of lines, this component will truncate the text to fit within
 * the given number of lines.
 *
 * This can also adjust the overflow ellipsis to be any text you want, and can truncate at
 * any position in the text (ie, the beginning, middle, or end of the line)
 */
export default function CustomTextOverflow({
  children,
  ellipsis = "...",
  maxLines = 1,
  truncatePosition = -1,
}: CustomTextOverflowProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [refreshSignal, setRefreshSignal] = useState(0)

  /**
   * measure the number of lines taken up by the text, and recursively
   * shorten the text until it fits within the given number of lines
   */
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const lines = getNumberOfLines(wrapperRef.current)

    if (lines <= maxLines) {
      wrapper.textContent = children
      return () => {
        wrapper.textContent = `${children}${ellipsis}`
      }
    }

    // recursively shrink the text until it fits
    const shrinkText = (numberOfCharsToRemove: number) => {
      // where we shrink the text needs to change if the truncate position is pos/neg
      const shrinkBefore = truncatePosition < 0
      // we need to use slightly different math to put the ellipses at the very end
      const ellipsisAtEnd = truncatePosition === 0
      const textBeforeEllipsis = ellipsisAtEnd
        ? children.slice(0, children.length - numberOfCharsToRemove)
        : children.slice(
            0,
            truncatePosition - (shrinkBefore ? numberOfCharsToRemove : 0),
          )
      const textAfterEllipsis = ellipsisAtEnd
        ? ""
        : children.slice(
            truncatePosition + (shrinkBefore ? 0 : numberOfCharsToRemove),
          )

      const newText = `${textBeforeEllipsis}${ellipsis}${textAfterEllipsis}`

      wrapper.textContent = newText
      if (getNumberOfLines(wrapper) <= maxLines) return
      if (numberOfCharsToRemove >= children.length) return
      shrinkText(numberOfCharsToRemove + 1)
    }

    shrinkText(1)

    return () => {
      wrapper.textContent = `${children}${ellipsis}`
    }
  }, [children, ellipsis, maxLines, truncatePosition, refreshSignal])

  /**
   * invalidate the text measurement when the window is resized
   */
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined
    const handleResize = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        setRefreshSignal(p => p + 1)
      })
    }

    const observer = new ResizeObserver(handleResize)
    if (wrapperRef.current instanceof HTMLElement)
      getAllParents(wrapperRef.current, 10).forEach(parent => {
        observer.observe(parent)
      })

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [])

  // prompt a CSS solution if possible
  if (ellipsis === "..." && truncatePosition === 0)
    return (
      <>
        This component should only be used if you need a custom ellipsis or
        custom truncation position. Otherwise, use CSS.
      </>
    )
  return (
    <div ref={wrapperRef}>
      {children}
      {/* include the ellipsis for measurement purposes */}
      {ellipsis}
    </div>
  )
}

/**
 * get the number of lines that fit within the given element
 * @param element the element to measure
 * @returns the number of lines that would fit within the element
 */
const getNumberOfLines = (element: HTMLElement) => {
  const { height } = element.getBoundingClientRect()
  const lineHeight = parseFloat(
    window.getComputedStyle(element).getPropertyValue("line-height"),
  )
  return Math.round(height / lineHeight)
}

/**
 * given an element, get all of its parents from nearest to farthest
 */
const getAllParents = (element: HTMLElement, limit: number) => {
  const parents = []
  let current = element.parentElement
  while (current && parents.length < limit) {
    parents.push(current)
    current = current.parentElement
  }
  return parents
}
