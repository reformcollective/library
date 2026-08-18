import { usePathname } from "next/navigation"
import {
	createContext,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react"
import { createDebouncedEventListener } from "./ScreenContext"

export type SectionTheme = "dark" | "light"

const DEFAULT_THEME: SectionTheme = "light"

const SectionThemeContext = createContext<{
	theme: SectionTheme
	setTheme: (theme: SectionTheme) => void
	/**
	 * seeds the theme for a newly-navigated-to page, using its known first
	 * section's `headerMode` instead of falling back to `DEFAULT_THEME` and
	 * waiting for scroll-based detection to correct it
	 */
	setInitialTheme: (theme: SectionTheme | undefined) => void
} | null>(null)

/**
 * Provides the shared section-theme state used by `useSectionTheme`/`useHeaderMode`.
 * Render this once, near the root of the app (e.g. alongside other global providers) —
 * everything that needs the header's current theme must be nested inside.
 */
export function SectionThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<SectionTheme>(DEFAULT_THEME)

	const setInitialTheme = useCallback((nextTheme: SectionTheme | undefined) => {
		setTheme(nextTheme ?? DEFAULT_THEME)
	}, [])

	const value = useMemo(
		() => ({ theme, setTheme, setInitialTheme }),
		[theme, setInitialTheme],
	)

	return (
		<SectionThemeContext.Provider value={value}>
			{children}
		</SectionThemeContext.Provider>
	)
}

function useSectionThemeContext() {
	const context = useContext(SectionThemeContext)
	if (!context) {
		throw new Error("useSectionTheme must be used within a SectionThemeProvider")
	}
	return context
}

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
	const { theme, setTheme } = useSectionThemeContext()

	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is only a re-run trigger on route change, not read in the effect
	useEffect(() => {
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

		const dispatchTheme = () => {
			const nextTheme = getActiveTheme()
			if (nextTheme) setTheme(nextTheme)
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

					dispatchTheme()
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
			dispatchTheme()
		}

		createObserver()
		scan()

		const resizeListener = createDebouncedEventListener(
			"resize",
			createObserver,
		)

		return () => {
			observer?.disconnect()
			resizeListener.cleanup()
		}
	}, [headerRef, pathname])

	return theme
}

/**
 * Subscribes to the current section theme, re-rendering only when it changes.
 * Use inside the header (or any component that needs to react to the active section's theme).
 */
export function useHeaderMode(): SectionTheme {
	return useSectionThemeContext().theme
}

/**
 * Seeds the header theme for the current page using its known first section's
 * `headerMode`, so the header shows the correct theme immediately after a page
 * transition instead of a default that scroll-based detection later corrects.
 *
 * Call once per page, passing the first section's `headerMode` (or `undefined`
 * if the page has no sections / the first section has none).
 */
export function useInitialHeaderMode(headerMode: SectionTheme | undefined) {
	const pathname = usePathname()
	const { setInitialTheme } = useSectionThemeContext()

	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is only a re-run trigger on route change
	useEffect(() => {
		setInitialTheme(headerMode)
	}, [pathname, headerMode, setInitialTheme])
}
