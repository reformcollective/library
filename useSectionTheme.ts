import { type RefObject, useEffect, useRef, useState } from "react"
import { createDebouncedEventListener } from "./ScreenContext"
import TypedEventEmitter from "./TypedEventEmitter"
import useSafePathname from "./useSafePathname"

export type SectionTheme = "dark" | "light"

const sectionThemeEvents = new TypedEventEmitter<{ change: [SectionTheme] }>({
	triggerHappyEvents: ["change"],
})

let currentTheme: SectionTheme = "light"

/**
 * Watches all elements tagged with `data-header-mode="dark" | "light"` and reports
 * which one is currently behind the header, via a single shared IntersectionObserver.
 *
 * Add `data-header-mode` to a section's root element to have it drive the header's theme
 * while it's scrolled behind it.
 *
 * @param headerRef ref pointing to the sticky header element, used to measure its height
 */
export default function useSectionTheme(headerRef: RefObject<HTMLElement | null>) {
	const pathname = useSafePathname()

	useEffect(() => {
		let observer: IntersectionObserver | null = null
		const observed = new Set<Element>()
		// sections currently intersecting the thin strip behind the header,
		// in the order they most recently entered it
		let activeElements: Element[] = []

		const getActiveTheme = (): SectionTheme | null => {
			const element = activeElements.at(-1)
			const mode = element?.getAttribute("data-header-mode")
			return mode === "dark" || mode === "light" ? mode : null
		}

		const createObserver = () => {
			observer?.disconnect()
			activeElements = []

			const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0
			// a thin strip right at the header's bottom edge — whichever section
			// crosses it (in either scroll direction) is the one behind the header
			const rootMargin = `-${headerHeight}px 0px -${Math.max(window.innerHeight - headerHeight - 1, 0)}px 0px`

			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						activeElements = activeElements.filter((el) => el !== entry.target)
						if (entry.isIntersecting) activeElements.push(entry.target)
					}

					const theme = getActiveTheme()
					if (theme && theme !== currentTheme) {
						currentTheme = theme
						sectionThemeEvents.dispatchEvent("change", theme)
					}
				},
				{ threshold: 0, rootMargin },
			)

			for (const element of observed) observer.observe(element)
		}

		const scan = () => {
			const elements = document.querySelectorAll("[data-header-mode]")
			for (const element of elements) {
				if (!observed.has(element)) {
					observed.add(element)
					observer?.observe(element)
				}
			}
		}

		createObserver()
		scan()

		const interval = setInterval(scan, 1_000)
		const resizeListener = createDebouncedEventListener("resize", createObserver)

		return () => {
			observer?.disconnect()
			clearInterval(interval)
			resizeListener.cleanup()
		}
	}, [headerRef, pathname])
}

/**
 * Subscribes to the current section theme, re-rendering only when it changes.
 * Use inside the header (or any component that needs to react to the active section's theme).
 */
export function useHeaderMode(): SectionTheme {
	const [theme, setTheme] = useState(currentTheme)
	sectionThemeEvents.useEventListener("change", setTheme)
	return theme
}
