import { useEventListener } from "ahooks"
import {
	createContext,
	startTransition,
	useEffect,
	useMemo,
	useState,
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
})

interface Props {
	children: React.ReactNode
}

export function ScreenProvider({ children }: Props) {
	const [fw, setFw] = useState<boolean>(false)
	const [d, setD] = useState<boolean>(false)
	const [t, setT] = useState<boolean>(false)
	const [m, setM] = useState<boolean>(true)

	const setScreenContext = () => {
		if (isBrowser)
			startTransition(() => {
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
			})
	}

	useEffect(setScreenContext)
	useEventListener("resize", setScreenContext)

	const screenValue = useMemo(() => {
		return { fullWidth: fw, desktop: d, tablet: t, mobile: m }
	}, [d, fw, t, m])

	return (
		<ScreenContext.Provider value={screenValue}>
			{children}
		</ScreenContext.Provider>
	)
}
