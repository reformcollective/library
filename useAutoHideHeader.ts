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
	extraOffset = 0,
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
			let lastScroll = window.lenisInstance?.scroll ?? window.scrollY
			let isHovered = false
			if (!wrapper?.current) return

			// reset header position on route change. This is important because otherwise the header could get stuck in the wrong position if the user navigates while it's hidden
			const resetHeader = (target: typeof wrapper.current) => {
				gsap.set(target, { y: 0 })
				if (target) {
					target.dataset.headerHiding = "false"
					target.dataset.headerScrolled = "false"
				}
			}
			resetHeader(wrapper.current)

			const props = {
				ease: "power1.out",
				duration: 0.4,
			}

			const yTo = gsap.quickTo(wrapper.current, "y", props)

			const onUpdate = () => {
				const scroll = window.lenisInstance?.scroll ?? window.scrollY
				const delta = scroll - lastScroll
				lastScroll = scroll
				const height = (wrapper.current?.offsetHeight ?? 0) + extraOffset
				if (delta > 100 || delta < -100) {
					// short circuit on large scrolls, since those are probably page transitions
					// still update scrolled state so scroll-dependent styles remain correct
					const el = wrapper.current
					if (el) el.dataset.headerScrolled = scroll <= 5 ? "false" : "true"
					return
				}

				const forceHideHeader = dataHideAreOnScreen.current
				const forceShowHeader =
					dataStickAreOnScreen.current || scroll === 0 || window.scrollY <= 5
				const showHeader = style === "snap" && delta < 0
				const hideHeader = style === "snap" && delta > 0

				const el = wrapper.current
				if (el) {
					if (scroll <= 5) el.dataset.headerScrolled = "false"
					else if (delta < 0 || isHovered) el.dataset.headerScrolled = "true"
				}

				// if forced sticky
				if (forceShowHeader || (showHeader && !forceHideHeader)) {
					yTo(0)
					if (el) el.dataset.headerHiding = "false"
				}
				// if forced not sticky
				else if (forceHideHeader || hideHeader) {
					yTo(reverse ? height : -height)
					if (el) el.dataset.headerHiding = "true"
				}
				// if hovered
				else if (isHovered) {
					yTo(0)
					if (el) el.dataset.headerHiding = "false"
				}
				// scrub behavior, if needed
				else if (style === "scrub") {
					const currentY = Number(gsap.getProperty(wrapper.current, "y"))
					const newY = Math.min(0, Math.max(-height, currentY - delta))
					const newPotentiallyReversedY = reverse ? -newY : newY
					yTo(newPotentiallyReversedY, newPotentiallyReversedY)
					if (el) el.dataset.headerHiding = String(delta > 0)
				}
			}

			const onHover = () => {
				isHovered = true
			}
			const onLeave = () => {
				isHovered = false
			}

			const onPopState = () => {
				requestAnimationFrame(() => {
					ScrollTrigger.refresh()
					const scroll = window.lenisInstance?.scroll ?? window.scrollY
					if (wrapper.current) {
						wrapper.current.dataset.headerScrolled = scroll <= 5 ? "false" : "true"
					}
				})
			}

			wrapper.current?.addEventListener("pointerenter", onHover)
			wrapper.current?.addEventListener("pointerleave", onLeave)
			window.addEventListener("popstate", onPopState)

			ScrollTrigger.create({ onUpdate })
			return () => {
				wrapper.current?.removeEventListener("pointerenter", onHover)
				wrapper.current?.removeEventListener("pointerleave", onLeave)
				window.removeEventListener("popstate", onPopState)
			}
		},
		[wrapper, style, reverse, extraOffset],
		{
			// reset to top when pathname changes
			extraDeps: [pathname],
		},
	)
}
