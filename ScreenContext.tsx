"use client"

import {
	desktopBreakpoint,
	mobileBreakpoint,
	tabletBreakpoint,
} from "app/styles/media"
import {
	createContext,
	useCallback,
	useEffect,
	useRef,
	useState,
	useTransition,
} from "react"

import { getVH } from "./viewportUtils"

type HydrationPhase =
	| "hydrating-react"
	| "hydrating-utilities"
	| "hydration-complete"

/**
 * Gives easy access to media queries
 */
export const ScreenContext = createContext({
	innerWidth: 0,
	viewportHeight: 0,
	fullWidth: false,
	desktop: false,
	tablet: false,
	mobile: false,
	/**
	 * should utilities like useMedia or useClientOnly be client hydrated?
	 *
	 * This will be set after initial hydration, so you don't need to worry about hydration errors
	 */
	shouldHydrateUtilities: false,
	/**
	 * initComplete will be set to true after
	 * screen context has completed setup AND any state updates
	 * triggered by screenContextReady have completed setup
	 *
	 * use this for animations, etc. that need to run after hydration has completed
	 */
	initComplete: false,
})

interface Props {
	children: React.ReactNode
}

performance.mark("hydrating-react")

export function ScreenProvider({ children }: Props) {
	/**
	 * screen size utilities
	 */
	const [fw, setFw] = useState<boolean>(false)
	const [d, setD] = useState<boolean>(false)
	const [t, setT] = useState<boolean>(false)
	const [m, setM] = useState<boolean>(true)
	const [innerWidth, setInnerWidth] = useState(0)
	const [viewportHeight, setViewportHeight] = useState(0)

	/**
	 * preloading utilities
	 */
	const [phase, setPhase] = useState<HydrationPhase>("hydrating-react")
	const [isTransitioning, startTransition] = useTransition()

	const setScreenContext = useCallback(() => {
		setM(window.innerWidth <= mobileBreakpoint)
		setT(
			window.innerWidth > mobileBreakpoint &&
				window.innerWidth <= tabletBreakpoint,
		)
		setD(
			window.innerWidth > tabletBreakpoint &&
				window.innerWidth <= desktopBreakpoint,
		)
		setFw(window.innerWidth > desktopBreakpoint)
		setInnerWidth(window.innerWidth)
		setViewportHeight(getVH(100))
	}, [])

	useEffect(() => {
		if (isTransitioning) return
		if (phase === "hydrating-react") {
			/**
			 * measure how long it takes to hydrate the page and fire this effect
			 */
			performance.measure("context: loading", {
				start: "hydrating-react",
				detail: {
					devtools: {
						dataType: "track-entry",
						track: "Screen Context",
						color: "tertiary-dark",
						tooltipText: "React is hydrating",
					},
				},
			})

			performance.mark("hydrating-utilities")
			startTransition(() => {
				setScreenContext()
				setPhase("hydrating-utilities")
			})
		}

		if (phase === "hydrating-utilities") {
			/**
			 * measure how long it takes to hydrate utilities like useAnimation and useMedia
			 */
			performance.measure("context: hydrating utilities", {
				start: "hydrating-utilities",
				detail: {
					devtools: {
						dataType: "track-entry",
						track: "Screen Context",
						color: "secondary",
						tooltipText:
							"Utilities, like useAnimation and useMedia, are hydrating",
					},
				},
			})

			performance.mark("hydration-complete")
			startTransition(() => {
				setPhase("hydration-complete")
			})
		}

		/**
		 * measure how long it takes to finish up any other work that depends on the screen context
		 */
		if (phase === "hydration-complete") {
			performance.measure("context: hydration complete", {
				start: "hydration-complete",
				detail: {
					devtools: {
						dataType: "track-entry",
						track: "Screen Context",
						color: "primary",
						tooltipText: "Hydration is finishing up",
					},
				},
			})
		}
	}, [phase, isTransitioning, setScreenContext])
	useDebouncedEventListener("resize", setScreenContext)

	return (
		<ScreenContext.Provider
			value={{
				innerWidth,
				fullWidth: fw,
				desktop: d,
				tablet: t,
				mobile: m,
				viewportHeight,
				shouldHydrateUtilities:
					phase === "hydrating-utilities" || phase === "hydration-complete",
				initComplete: phase === "hydration-complete",
			}}
		>
			{children}
		</ScreenContext.Provider>
	)
}

/**
 * hook version of adding debounced event listener
 * separate because needs to use ref for persistence
 */
export const useDebouncedEventListener = <
	K extends keyof GlobalEventHandlersEventMap,
>(
	event: K,
	listener: (ev: GlobalEventHandlersEventMap[K]) => unknown,
	delay = 500,
) => {
	const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		const handler = (ev: GlobalEventHandlersEventMap[K]) => {
			if (timeout.current) clearTimeout(timeout.current)
			timeout.current = setTimeout(() => {
				listener(ev)
			}, delay)
		}

		window.addEventListener(event, handler)
		return () => window.removeEventListener(event, handler)
	}, [delay, event, listener])
}

/**
 * imperative version of adding debounced event listener
 */
export const createDebouncedEventListener = <
	K extends keyof GlobalEventHandlersEventMap,
>(
	event: K,
	listener: (ev: GlobalEventHandlersEventMap[K]) => unknown,
	delay = 500,
) => {
	let timeout: ReturnType<typeof setTimeout> | null = null

	const handler = (ev: GlobalEventHandlersEventMap[K]) => {
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(() => {
			listener(ev)
		}, delay)
	}

	window.addEventListener(event, handler)
	return { cleanup: () => window.removeEventListener(event, handler) }
}
