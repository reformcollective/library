import { usePathname } from "next/navigation"
import { type RefObject, useEffect, useState } from "react"
import { createDebouncedEventListener } from "./ScreenContext"
import TypedEventEmitter from "./TypedEventEmitter"

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
export default function useSectionTheme(
	headerRef: RefObject<HTMLElement | null>,
) {
	const pathname = usePathname()

	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is only a re-run trigger on route change, not read in the effect
	useEffect(() => {
		// temp debug: identify this specific effect instance for correlating with useAutoHideHeader
		const instanceId = Math.random().toString(36).slice(2, 8)
		console.log("[debug-header] useSectionTheme instance created", { instanceId, pathname })

		let observer: IntersectionObserver | null = null
		const observed = new Set<Element>()
		// sections currently intersecting the thin strip behind the header,
		// in the order they most recently entered it
		let activeElements: Element[] = []

		// a pinned section (given a negative z-index so the section after it can
		// scroll up and visually cover it) can re-enter this strip on a small
		// scroll reversal without the covering section ever exiting — so whenever
		// another, non-pinned section is also behind the header, prefer that one
		const getActiveTheme = (): SectionTheme | null => {
			const isPinnedBehind = (el: Element) =>
				Number.parseInt(getComputedStyle(el).zIndex, 10) < 0

			const candidates = activeElements.some((el) => !isPinnedBehind(el))
				? activeElements.filter((el) => !isPinnedBehind(el))
				: activeElements

			const element = candidates.at(-1)
			const mode = element?.getAttribute("data-header-mode")
			return mode === "dark" || mode === "light" ? mode : null
		}

		const dispatchTheme = (source: string) => {
			const theme = getActiveTheme()
			const willFire = !!theme && theme !== currentTheme
			// temp debug: trace every dispatch decision, including silent no-ops
			console.log("[debug-header] dispatchTheme", {
				pathname,
				source,
				computedTheme: theme,
				currentTheme,
				willFire,
				activeElementCount: activeElements.length,
			})
			if (willFire) {
				currentTheme = theme
				sectionThemeEvents.dispatchEvent("change", theme)
			}
		}

		const createObserver = () => {
			observer?.disconnect()
			activeElements = []

			const headerHeight =
				headerRef.current?.getBoundingClientRect().height ?? 0
			// a thin strip right at the header's bottom edge — whichever section
			// crosses it (in either scroll direction) is the one behind the header
			const rootMargin = `-${headerHeight}px 0px -${Math.max(window.innerHeight - headerHeight - 1, 0)}px 0px`

			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						activeElements = activeElements.filter((el) => el !== entry.target)
						if (entry.isIntersecting) activeElements.push(entry.target)
					}

					dispatchTheme("observer")
				},
				{ threshold: 0, rootMargin },
			)

			for (const element of observed) observer.observe(element)
		}

		const scan = () => {
			const elements = document.querySelectorAll("[data-header-mode]")
			const newlyObserved: Element[] = []
			for (const element of elements) {
				if (!observed.has(element)) {
					observed.add(element)
					observer?.observe(element)
					newlyObserved.push(element)
				}
			}
			if (newlyObserved.length === 0) return

			// don't wait for the observer's async callback to catch up on newly
			// observed elements (e.g. right after a route change) — check
			// synchronously so the header doesn't hold onto a stale theme from
			// before those elements existed
			const headerHeight =
				headerRef.current?.getBoundingClientRect().height ?? 0
			for (const element of newlyObserved) {
				const rect = element.getBoundingClientRect()
				const isInStrip =
					rect.top < window.innerHeight && rect.bottom > headerHeight
				if (isInStrip) activeElements.push(element)
			}
			dispatchTheme("scan")
		}

		createObserver()
		scan()

		const interval = setInterval(scan, 1_000)
		const resizeListener = createDebouncedEventListener(
			"resize",
			createObserver,
		)

		return () => {
			console.log("[debug-header] useSectionTheme instance cleanup", { instanceId, pathname })
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
