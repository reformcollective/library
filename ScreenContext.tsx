import { useEventListener } from "ahooks"
import {
	createContext,
	useCallback,
	useEffect,
	useState,
	useTransition,
} from "react"
import {
	desktopBreakpoint,
	mobileBreakpoint,
	tabletBreakpoint,
} from "styles/media"
import { isBrowser } from "./deviceDetection"

/**
 * Gives easy access to media queries
 */
export const ScreenContext = createContext({
	fullWidth: false,
	desktop: false,
	tablet: false,
	mobile: false,
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
	const [needsInit, setNeedsInit] = useState(true)
	const [initializing, startTransition] = useTransition()

	const setScreenContext = useCallback(() => {
		if (isBrowser) setM(window.innerWidth <= mobileBreakpoint)
		setT(
			window.innerWidth > mobileBreakpoint &&
				window.innerWidth <= tabletBreakpoint,
		)
		setD(
			window.innerWidth > tabletBreakpoint &&
				window.innerWidth <= desktopBreakpoint,
		)
		setFw(window.innerWidth > desktopBreakpoint)
		setNeedsInit(false)
	}, [])

	useEffect(() => {
		startTransition(setScreenContext)
	}, [setScreenContext])
	useEventListener("resize", setScreenContext)

	return (
		<ScreenContext.Provider
			value={{
				fullWidth: fw,
				desktop: d,
				tablet: t,
				mobile: m,
				initComplete: !initializing && !needsInit,
			}}
		>
			{children}
		</ScreenContext.Provider>
	)
}
