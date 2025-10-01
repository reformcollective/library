import { gsap, ScrollTrigger } from "gsap/all"
import { usePathname } from "next/navigation"
import { type RefObject, useEffect, useRef } from "react"
import { useIsSmooth } from "./Scroll"
import { useAnimation } from "./useAnimation"

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
	wrapper: RefObject<HTMLDivElement | null> | null | undefined,
	styleIn: "scrub" | "snap" = "scrub",
	reverse = false,
) {
	// scrub style only really works if we're using a smoother
	const isSmooth = useIsSmooth()
	const style = isSmooth ? styleIn : "snap"

	const pathname = usePathname()

	const dataHideAreOnScreen = useRef(false)
	const dataStickAreOnScreen = useRef(false)

	/**
	 * use intersection observer to check if the elements are in view
	 */
	useEffect(() => {
		const onScreen: HTMLElement[] = []

		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					onScreen.push(entry.target as HTMLElement)
				} else {
					const index = onScreen.indexOf(entry.target as HTMLElement)
					if (index >= 0) onScreen.splice(index, 1)
				}

				dataStickAreOnScreen.current =
					onScreen.filter((x) => x.dataset.headerStick === "true").length > 0
				dataHideAreOnScreen.current =
					onScreen.filter((x) => x.dataset.headerHide === "true").length > 0
			}
		})

		const observe = () => {
			const elements = document.querySelectorAll(
				"[data-header-hide], [data-header-stick]",
			)
			for (const element of elements) {
				observer.observe(element)
			}
		}

		observe()
		const interval = setInterval(observe, 1_000)

		return () => {
			observer.disconnect()
			clearInterval(interval)
		}
	}, [])

	useAnimation(
		() => {
			let lastScroll = 0
			let isHovered = false
			if (!wrapper) return

			const props = {
				ease: "power1.out",
				duration: 0.4,
			}

			const yTo = gsap.quickTo(wrapper.current, "y", props)

			const onUpdate = () => {
				const scroll = window.lenis?.scroll ?? 0
				const delta = scroll - lastScroll
				lastScroll = scroll
				const height = wrapper.current?.offsetHeight ?? 0
				if (delta > 100 || delta < -100) return // short circuit on large scrolls, since those are probably page transitions

				const forceHideHeader = dataHideAreOnScreen.current
				const forceShowHeader =
					dataStickAreOnScreen.current || scroll === 0 || window.scrollY <= 5
				const showHeader = style === "snap" && delta < 0
				const hideHeader = style === "snap" && delta > 0

				// if forced sticky
				if (forceShowHeader || (showHeader && !forceHideHeader)) {
					yTo(0)
				}
				// if forced not sticky
				else if (forceHideHeader || hideHeader) {
					yTo(reverse ? height : -height)
				}
				// if hovered
				else if (isHovered) {
					yTo(0)
				}
				// scrub behavior, if needed
				else if (style === "scrub") {
					const currentY = Number(gsap.getProperty(wrapper.current, "y"))
					const newY = Math.min(0, Math.max(-height, currentY - delta))
					const newPotentiallyReversedY = reverse ? -newY : newY
					yTo(newPotentiallyReversedY, newPotentiallyReversedY)
				}
			}

			const onHover = () => {
				isHovered = true
			}
			const onLeave = () => {
				isHovered = false
			}

			wrapper.current?.addEventListener("pointerenter", onHover)
			wrapper.current?.addEventListener("pointerleave", onLeave)

			ScrollTrigger.create({ onUpdate })
			const interval = setInterval(onUpdate, 100)
			return () => {
				clearInterval(interval)
				wrapper.current?.removeEventListener("pointerenter", onHover)
				wrapper.current?.removeEventListener("pointerleave", onLeave)
			}
		},
		[wrapper, style, reverse],
		{
			// reset to top when pathname changes
			extraDeps: [pathname],
		},
	)
}
