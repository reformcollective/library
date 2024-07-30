import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { type RefObject, useEffect, useRef, useState } from "react"

const isElementInViewport = (element: HTMLElement | null) => {
	const rect = element?.getBoundingClientRect()
	return (
		rect &&
		rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
		rect.bottom >= 0
	)
}

const checkElementsInViewport = (elementIds: string[]) => {
	for (const elementId of elementIds) {
		const element = document.getElementById(elementId)
		if (element && isElementInViewport(element)) {
			return true
		}
	}
	return false
}

/**
 * A custom hook that controls header visibility based on scroll position and specified elements.
 *
 * @param wrapper The ref object of the header element.
 * @param hideHeaderElementIds An array of element IDs that will hide the header when in view.
 * @param stickyHeaderElementIds An array of element IDs that will make the header sticky when in view.
 * @returns The current translateY value for the header, which allows for vertical positioning.
 */
export default function useAutoHideHeader(
	wrapper: RefObject<HTMLDivElement>,
	hideHeaderElementIds: string[] = [],
	stickyHeaderElementIds: string[] = [],
) {
	const [translateY, setTranslateY] = useState(0)
	const translateYRef = useRef(0)

	// Update translateYRef whenever the state variables changes.
	useEffect(() => {
		translateYRef.current = translateY
	}, [translateY])

	useEffect(() => {
		let lastScroll = 0

		ScrollTrigger.create({
			onUpdate: () => {
				const scroll = ScrollSmoother.get()?.scrollTop() ?? 0
				const delta = scroll - lastScroll
				lastScroll = scroll
				const height = wrapper.current?.offsetHeight ?? 0

				// Check for elements included in the hideHeaderElementIds and stickyHeaderElementIds arrays
				const shouldHideHeader = checkElementsInViewport(hideHeaderElementIds)
				const shouldStickyHeader = checkElementsInViewport(
					stickyHeaderElementIds,
				)

				if (shouldHideHeader) {
					setTranslateY(-height)
				} else if (shouldStickyHeader) {
					setTranslateY(0)
				} else {
					if (scroll === 0) {
						translateYRef.current = 0
					} else if (delta > 0) {
						translateYRef.current = Math.max(
							-height,
							translateYRef.current - delta,
						)
					} else {
						translateYRef.current = Math.min(0, translateYRef.current - delta)
					}
					setTranslateY(translateYRef.current)
				}
			},
		})
	}, [stickyHeaderElementIds, hideHeaderElementIds, wrapper])

	return translateY
}
