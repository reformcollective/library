"use client"

import { useAsyncEffect } from "ahooks"
import { createContext, useCallback, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import {
	desktopBreakpoint,
	mobileBreakpoint,
	tabletBreakpoint,
} from "styles/media"

/**
 * we can use flushSync to control the order things will hydrate in synchronously
 */
type HydrationPhase =
	| "hydrating-react"
	| "hydrating-utilities"
	| "hydrating-animations"
	| "hydration-complete"

/**
 * Gives easy access to media queries
 */
export const ScreenContext = createContext({
	innerWidth: 0,
	innerHeight: 0,
	fullWidth: false,
	desktop: false,
	tablet: false,
	mobile: false,
	/**
	 * should utilities like useMedia or useClientOnly be client hydrated?
	 *
	 * This will be set after initial hydration, so you don't need to worry about hydration errors
	 */
	hydrateUtilities: false,
	/**
	 * Should animations be created and run on the client?
	 *
	 * This will be set after initial hydration, so you don't need to worry about hydration errors
	 * This will also be set after utilities like useMedia or useClientOnly are hydrated
	 */
	hydrateAnimations: false,
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

performance.mark("context-loaded")
const hydrationSleep = () => {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			resolve()
		})
	})
}

export function ScreenProvider({ children }: Props) {
	const [fw, setFw] = useState<boolean>(false)
	const [d, setD] = useState<boolean>(false)
	const [t, setT] = useState<boolean>(false)
	const [m, setM] = useState<boolean>(true)
	const [innerWidth, setInnerWidth] = useState(0)
	const [innerHeight, setInnerHeight] = useState(0)
	const [phase, setPhase] = useState<HydrationPhase>("hydrating-react")

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
		setInnerHeight(window.innerHeight)
		setInnerWidth(window.innerWidth)
	}, [])

	useAsyncEffect(async () => {
		performance.measure("context: loading", "context-loaded")

		performance.mark("setting-context")
		await hydrationSleep()
		flushSync(() => setScreenContext())
		performance.measure("context: setting", "setting-context")

		performance.mark("hydrating-utilities")
		await hydrationSleep()
		flushSync(() => setPhase("hydrating-utilities"))
		performance.measure("context: hydrating utilities", "hydrating-utilities")

		performance.mark("hydrating-animations")
		await hydrationSleep()
		flushSync(() => setPhase("hydrating-animations"))
		performance.measure("context: hydrating animations", "hydrating-animations")

		performance.mark("hydration-complete")
		await hydrationSleep()
		flushSync(() => setPhase("hydration-complete"))
		performance.mark("hydration-complete")
	}, [setScreenContext])
	useDebouncedEventListener("resize", setScreenContext)

	return (
		<ScreenContext.Provider
			value={{
				innerHeight,
				innerWidth,
				fullWidth: fw,
				desktop: d,
				tablet: t,
				mobile: m,
				hydrateUtilities:
					phase === "hydrating-utilities" ||
					phase === "hydrating-animations" ||
					phase === "hydration-complete",
				hydrateAnimations:
					phase === "hydrating-animations" || phase === "hydration-complete",
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
