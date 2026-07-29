import { useLatest } from "ahooks"
import { gsap, ScrollTrigger } from "gsap/all"
import { type RefObject, useEffect, useRef, useState } from "react"
import { useIsSmooth } from "./Scroll"
import TypedEventEmitter from "./TypedEventEmitter"
import { useAnimation } from "./useAnimation"
import useSafePathname from "./useSafePathname"

const HEADER_HEIGHT_VAR = "--site-header-height"
const HEADER_VISIBLE_OFFSET_VAR = "--site-header-visible-offset"
const SCROLLED_THRESHOLD = 100
// extra px beyond the measured height so no sliver of the header remains visible when hidden
const HIDE_BUFFER = 8

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value))
}

// TODO: package this as a component as AutoHidingHeader instead of a hook
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
	externallyForceVisible = false,
) {
	// scrub style only really works if we're using a smoother
	const isSmooth = useIsSmooth()
	const style = isSmooth ? styleIn : "snap"

	const pathname = useSafePathname()

	const dataHideAreOnScreen = useRef(false)
	const dataStickAreOnScreen = useRef(false)

	const [externalForceEvents] = useState(
		() =>
			new TypedEventEmitter<{
				change: [boolean]
			}>(),
	)
	const latestExternalForceVisible = useLatest(externallyForceVisible)
	useEffect(() => {
		externalForceEvents.dispatchEvent("change", externallyForceVisible)
	}, [externallyForceVisible, externalForceEvents])

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

			const publishHeaderVars = (target: HTMLDivElement) => {
				const height = target.offsetHeight + extraOffset
				const y = Number(gsap.getProperty(target, "y")) || 0
				const visibleOffset = reverse ? height - y : height + y
				const root = document.documentElement

				root.style.setProperty(HEADER_HEIGHT_VAR, `${height}px`)
				root.style.setProperty(
					HEADER_VISIBLE_OFFSET_VAR,
					`${clamp(visibleOffset, 0, height)}px`,
				)
			}

			// reset header position on route change. This is important because otherwise the header could get stuck in the wrong position if the user navigates while it's hidden
			const resetHeader = (target: typeof wrapper.current) => {
				gsap.set(target, { y: 0 })
				if (target) {
					target.dataset.headerHiding = "false"
					const scroll = window.lenisInstance?.scroll ?? window.scrollY
					target.dataset.headerScrolled =
						scroll <= SCROLLED_THRESHOLD ? "false" : "true"
					publishHeaderVars(target)
				}
			}
			resetHeader(wrapper.current)

			const props = {
				ease: "power1.out",
				duration: 0.4,
				onUpdate: () => {
					if (wrapper.current) publishHeaderVars(wrapper.current)
				},
			}

			const yTo = gsap.quickTo(wrapper.current, "y", props)
			const resizeObserver = new ResizeObserver(() => {
				if (wrapper.current) publishHeaderVars(wrapper.current)
			})
			resizeObserver.observe(wrapper.current)

			const onUpdate = () => {
				const scroll = window.lenisInstance?.scroll ?? window.scrollY
				const rawDelta = scroll - lastScroll
				const delta = Math.abs(rawDelta) < 100 ? rawDelta : 0
				lastScroll = scroll
				const height = (wrapper.current?.offsetHeight ?? 0) + extraOffset

				const forceHideHeader = dataHideAreOnScreen.current
				const forceShowHeader =
					latestExternalForceVisible.current ||
					dataStickAreOnScreen.current ||
					scroll === 0 ||
					window.scrollY <= 5
				const showHeader = style === "snap" && delta < 0
				const hideHeader = style === "snap" && delta > 0

				const el = wrapper.current
				if (el) {
					el.dataset.headerScrolled =
						scroll <= SCROLLED_THRESHOLD ? "false" : "true"
				}

				// if forced sticky
				if (forceShowHeader || (showHeader && !forceHideHeader)) {
					yTo(0)
					if (el) el.dataset.headerHiding = "false"
				}
				// if forced not sticky
				else if (forceHideHeader || hideHeader) {
					const hiddenY = height + HIDE_BUFFER
					yTo(reverse ? hiddenY : -hiddenY)
					if (el) el.dataset.headerHiding = "true"
				}
				// if hovered
				else if (isHovered) {
					yTo(0)
					if (el) el.dataset.headerHiding = "false"
				}
				// scrub behavior, if needed
				else if (style === "scrub") {
					const hiddenHeight = height + HIDE_BUFFER
					const currentY = Number(gsap.getProperty(wrapper.current, "y"))
					const newY = Math.min(0, Math.max(-hiddenHeight, currentY - delta))
					const newPotentiallyReversedY = reverse ? -newY : newY
					yTo(newPotentiallyReversedY, newPotentiallyReversedY)
					if (el) el.dataset.headerHiding = String(delta > 0)
				}
			}

			const onHover = () => {
				isHovered = true
				onUpdate()
			}
			const onLeave = () => {
				isHovered = false
				onUpdate()
			}

			const onPopState = () => {
				requestAnimationFrame(() => {
					ScrollTrigger.refresh()
					const scroll = window.lenisInstance?.scroll ?? window.scrollY
					if (wrapper.current) {
						wrapper.current.dataset.headerScrolled =
							scroll <= SCROLLED_THRESHOLD ? "false" : "true"
					}
				})
			}

			wrapper.current?.addEventListener("pointerenter", onHover)
			wrapper.current?.addEventListener("pointerleave", onLeave)
			window.addEventListener("popstate", onPopState)
			externalForceEvents.addEventListener("change", onUpdate)

			ScrollTrigger.create({ onUpdate })
			return () => {
				wrapper.current?.removeEventListener("pointerenter", onHover)
				wrapper.current?.removeEventListener("pointerleave", onLeave)
				window.removeEventListener("popstate", onPopState)
				externalForceEvents.removeEventListener("change", onUpdate)
				resizeObserver.disconnect()
			}
		},
		[
			wrapper,
			style,
			reverse,
			extraOffset,
			latestExternalForceVisible,
			externalForceEvents,
		],
		{
			// reset to top when pathname changes
			extraDeps: [pathname],
		},
	)
}
