import gsap from "gsap"
import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { type RefObject, useRef } from "react"
import useAnimation from "./useAnimation"

const isElementInViewport = (element: HTMLElement) => {
	const rect = element?.getBoundingClientRect()
	return (
		rect &&
		rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
		rect.bottom >= 0
	)
}

/**
 * check if any elements with the given attribute are in the viewport
 * @param attribute the attribute to check for
 */
const checkElementsByAttribute = (attribute: string) => {
	const elements = document.querySelectorAll(`[${attribute}]`)
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
 * Add the `data-header-hide` attribute to an element to hide the header when it is in view.
 * Add the `data-header-stick` ID to an element to show the header when it is in view.
 *
 * @param wrapper ref pointing to the element to the header
 * @param style the style to use for the header, either "scrub" which will sync with the scroller or "snap" which animates in either direction
 */
export default function useAutoHideHeader(
	wrapper: RefObject<HTMLDivElement> | null | undefined,
	style: "scrub" | "snap" = "scrub",
) {
	const translateY = useRef(0)

	// if we're on scrub style, we want instant set, but this would cause a jump
	// whenever we transition from a forced stick/hide to a normal scroll based value
	// so tween the duration from 0.5 to 0 to avoid this
	const duration = useRef(0.5)

	useAnimation(() => {
		let lastScroll = 0
		if (!wrapper) return

		const props = {
			ease: "power3.out",
			duration: 0.3,
		}

		ScrollTrigger.create({
			onUpdate: () => {
				const scroll = ScrollSmoother.get()?.scrollTop() ?? 0
				const delta = scroll - lastScroll
				lastScroll = scroll
				const height = wrapper.current?.offsetHeight ?? 0

				const shouldHideHeader = checkElementsByAttribute("data-header-hide")
				const shouldStickyHeader = checkElementsByAttribute("data-header-stick")

				// if forced sticky
				if (
					shouldStickyHeader ||
					(style === "snap" && delta < 0) ||
					scroll === 0 ||
					window.scrollY === 0
				) {
					duration.current = 0.5
					gsap.to(wrapper.current, {
						y: 0,
						...props,
					})
				}
				// if forced not sticky
				else if (shouldHideHeader || (style === "snap" && delta > 0)) {
					duration.current = 0.5
					gsap.to(wrapper.current, {
						y: -height,
						...props,
					})
				}
				// scrub behavior, if needed
				else if (style === "scrub") {
					translateY.current = Math.min(
						0,
						Math.max(-height, translateY.current - delta),
					)
					gsap.to(duration, { current: 0, ease: "linear" })
					gsap.to(wrapper.current, {
						y: translateY.current,
						...props,
						duration: duration.current,
					})
				}
			},
		})
	}, [wrapper, style])
}
