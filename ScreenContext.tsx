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
import { useDebouncedEventListener } from "./viewportUtils"

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
		// if page content overflows, we'll get the wrong innerwidth
		// so hide it before calculating the media queries
		document.body.style.display = "none"
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
		document.body.style.removeProperty("display")
		setNeedsInit(false)
	}, [])

	useEffect(() => {
		startTransition(setScreenContext)
	}, [setScreenContext])
	useDebouncedEventListener("resize", setScreenContext)

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
