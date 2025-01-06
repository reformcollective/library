"use client"

import {
	createContext,
	useCallback,
	useEffect,
	useRef,
	useState,
	useTransition,
} from "react"
import {
	desktopBreakpoint,
	mobileBreakpoint,
	tabletBreakpoint,
} from "styles/media"

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
	 * screen context ready will be set to true
	 * before animations are run - any state updates
	 * it triggers will also delay initComplete
	 *
	 * use this for state updates, etc. that need to run during hydration
	 */
	screenContextReady: false,
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

export function ScreenProvider({ children }: Props) {
	const [fw, setFw] = useState<boolean>(false)
	const [d, setD] = useState<boolean>(false)
	const [t, setT] = useState<boolean>(false)
	const [m, setM] = useState<boolean>(true)
	const [innerWidth, setInnerWidth] = useState(0)
	const [innerHeight, setInnerHeight] = useState(0)
	const [needsInit, setNeedsInit] = useState(true)
	const [initializing, startTransition] = useTransition()

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
		setNeedsInit(false)
	}, [])

	useEffect(() => {
		startTransition(setScreenContext)
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
				initComplete: !initializing && !needsInit,
				screenContextReady: !needsInit,
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
