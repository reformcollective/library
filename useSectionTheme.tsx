import { usePathname } from "next/navigation"
import {
	createContext,
	type RefObject,
	useContext,
	useEffect,
	useState,
} from "react"
import { createDebouncedEventListener } from "./ScreenContext"

export type SectionTheme = "dark" | "light"

const DEFAULT_THEME: SectionTheme = "light"

const SectionThemeContext = createContext<{
	theme: SectionTheme
	setTheme: (theme: SectionTheme) => void
	/** seeds the theme for a newly-navigated-to page from its known first section */
	setInitialTheme: (theme: SectionTheme | undefined) => void
} | null>(null)

/**
 * Provides the shared section-theme state used by `useSectionTheme`/`useHeaderMode`.
 * Render this once, near the root of the app (e.g. alongside other global providers) —
 * everything that needs the header's current theme must be nested inside.
 */
export function SectionThemeProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [theme, setTheme] = useState<SectionTheme>(DEFAULT_THEME)

	const setInitialTheme = (nextTheme: SectionTheme | undefined) => {
		setTheme(nextTheme ?? DEFAULT_THEME)
	}

	const value = { theme, setTheme, setInitialTheme }

	return (
		<SectionThemeContext.Provider value={value}>
			{children}
		</SectionThemeContext.Provider>
	)
}

function useSectionThemeContext() {
	const context = useContext(SectionThemeContext)
	if (!context) {
		throw new Error(
			"useSectionTheme must be used within a SectionThemeProvider",
		)
	}
	return context
}

/**
 * Watches all elements tagged with `data-header-mode="dark" | "light"` and reports
 * which one is currently behind the given element, via a single IntersectionObserver.
 *
 * Add `data-header-mode` to a section's root element to have it drive the theme of
 * anything tracking it while it's scrolled behind.
 *
 * The section is read from a thin horizontal strip across the element, placed
 * `offset` percent down from the element's top edge — so it works for an element
 * fixed anywhere on screen, e.g. a header at the top or a bar at the bottom.
 *
 * @param elementRef ref pointing to the fixed element, used to measure where it sits
 * @param options.offset where the strip sits, as a percentage of the element's height from its top. defaults to 50 (the center)
 * @param options.shared publish to the shared theme read by `useHeaderMode` (default). pass false to keep the result local to this element, so several elements can each track what's behind them
 */
export default function useSectionTheme(
	elementRef: RefObject<HTMLElement | null>,
	{ offset = 50, shared = true }: { offset?: number; shared?: boolean } = {},
) {
	const pathname = usePathname()
	const context = useSectionThemeContext()
	const [localTheme, setLocalTheme] = useState<SectionTheme>(DEFAULT_THEME)
	const theme = shared ? context.theme : localTheme
	const setTheme = shared ? context.setTheme : setLocalTheme

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

		// the viewport y of the strip: `offset` percent down the element, measured
		// from where it actually sits on screen rather than assuming the top
		const getStripY = () => {
			const rect = elementRef.current?.getBoundingClientRect()
			if (!rect) return 0
			return Math.round(rect.top + rect.height * (offset / 100))
		}

		const createObserver = () => {
			observer?.disconnect()
			activeElements = []

			const stripY = getStripY()
			// a thin strip across the element — whichever section crosses it (in
			// either scroll direction) is the one behind the element
			const rootMargin = `-${stripY}px 0px -${Math.max(window.innerHeight - stripY - 1, 0)}px 0px`

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
			const stripY = getStripY()
			for (const element of newlyObserved) {
				const rect = element.getBoundingClientRect()
				const isInStrip = rect.top <= stripY && rect.bottom > stripY
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

		// on a route change, the new page's `[data-header-mode]` sections can still be
		// streaming/mounting after this effect's initial scan runs and finds none yet —
		// keep watching the DOM so we scan again once they actually appear
		const mutationObserver = new MutationObserver(scan)
		mutationObserver.observe(document.body, { childList: true, subtree: true })

		return () => {
			observer?.disconnect()
			resizeListener.cleanup()
			mutationObserver.disconnect()
		}
	}, [elementRef, pathname, offset, setTheme])

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
 * Seeds the header theme for the current page from its first section's `headerMode`,
 * so the header is correct immediately after navigation instead of a placeholder default.
 */
export function useInitialHeaderMode(headerMode: SectionTheme | undefined) {
	const pathname = usePathname()
	const { setInitialTheme } = useSectionThemeContext()

	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is only a re-run trigger on route change
	useEffect(() => {
		setInitialTheme(headerMode)
	}, [pathname, headerMode, setInitialTheme])
}
