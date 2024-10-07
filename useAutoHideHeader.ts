import gsap from "gsap"
import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import type { RefObject } from "react"
import { useIsSmooth } from "./Scroll"
import useAnimation from "./useAnimation"

const clamp = (min: number, max: number, value: number) => {
	return Math.min(Math.max(min, value), max)
}

const isElementInViewport = (element: Element) => {
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
		if (isElementInViewport(element)) {
			return true
		}
	}
	return false
}

/**
 * A custom hook that controls header visibility based on scroll position and specified elements.
 *
 * Add the `data-header-hide` attribute to an element to hide the header when it is in view.
 * Add the `data-header-stick` attribute to an element to show the header when it is in view.
 *
 * @param wrapper ref pointing to the element to the header
 * @param style the style to use for the header, either "scrub" which will sync with the scroller or "snap" which animates in either direction
 */
export default function useAutoHideHeader(
	wrapper: RefObject<HTMLDivElement> | null | undefined,
	styleIn: "scrub" | "snap" = "scrub",
) {
	// scrub style only really works if we're using a smoother
	const isSmooth = useIsSmooth()
	const style = isSmooth ? styleIn : "snap"

	useAnimation(() => {
		let lastScroll = 0
		if (!wrapper) return

		const props = {
			ease: "power2.out",
			duration: style === "snap" ? 1 : 0.5,
		}

		const yTo = gsap.quickTo(wrapper.current, "y", props)

		ScrollTrigger.create({
			onUpdate: () => {
				const scroll = ScrollSmoother.get()?.scrollTop() ?? 0
				const delta = scroll - lastScroll
				lastScroll = scroll
				const height = wrapper.current?.offsetHeight ?? 0
				if (delta > 100 || delta < -100) return // short circuit on large scrolls, since those are probably page transitions

				const forceHideHeader = checkElementsByAttribute("data-header-hide")
				const forceShowHeader =
					checkElementsByAttribute("data-header-stick") ||
					scroll === 0 ||
					window.scrollY === 0
				const showHeader = style === "snap" && delta < 0
				const hideHeader = style === "snap" && delta > 0

				// if forced sticky
				if (forceShowHeader || (showHeader && !forceHideHeader)) {
					yTo(0)
				}
				// if forced not sticky
				else if (forceHideHeader || hideHeader) {
					yTo(-height)
				}
				// scrub behavior, if needed
				else if (style === "scrub") {
					const currentY = Number(gsap.getProperty(wrapper.current, "y"))
					const newY = Math.min(0, Math.max(-height, currentY - delta))
					yTo(newY, newY)
				}
			},
		})
	}, [wrapper, style])
}
