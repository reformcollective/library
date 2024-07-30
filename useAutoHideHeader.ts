import gsap from "gsap"
import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { type RefObject, useEffect, useRef, useState } from "react"

gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

const isElementInViewport = (element: HTMLElement) => {
	const rect = element?.getBoundingClientRect()
	return (
		rect &&
		rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
		rect.bottom >= 0
	)
}

const checkElementsInViewport = (id: string) => {
	const elements = document.querySelectorAll(`[id^="${id}"]`)
	for (const element of elements) {
		if (isElementInViewport(element as HTMLElement)) {
			return true
		}
	}
	return false
}

/**
 * A custom hook that controls header visibility based on scroll position and specified elements.
 *
 * Add the `hide-header` ID to an element to hide the header when it is in view.
 * Add the `stick-header` ID to an element to stick the header when it is in view.
 *
 * @param wrapper The ref object of the header element.
 * @returns The current translateY value for the header, which allows for vertical positioning.
 */
export default function useAutoHideHeader(wrapper: RefObject<HTMLDivElement>) {
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

				// Check for elements that have the specified IDs.
				const shouldHideHeader = checkElementsInViewport("hide-header")
				const shouldStickyHeader = checkElementsInViewport("stick-header")

				if (shouldHideHeader) {
					setTranslateY(-height)
				} else if (shouldStickyHeader) {
					setTranslateY(0)
				} else {
					if (scroll === 0) {
						translateYRef.current = 0
					} else if (delta > 0) {
						/**
						 * The commented lines below give the header movement more of a scrubbing effect.
						 */
						// translateYRef.current = Math.max(
						// 	-height,
						// 	translateYRef.current - delta,
						// )
						translateYRef.current = -height
					} else {
						// translateYRef.current = Math.min(0, translateYRef.current - delta)
						translateYRef.current = 0
					}
					setTranslateY(translateYRef.current)
				}
			},
		})
	}, [wrapper])

	return translateY
}
