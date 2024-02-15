import { addDebouncedEventListener, isBrowser } from "library/functions"
import {
	createContext,
	startTransition,
	useEffect,
	useMemo,
	useState,
} from "react"
import {
	desktopBreakpoint as desktop,
	mobileBreakpoint as mobile,
	tabletBreakpoint as tablet,
} from "styles/media"

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

// TODO setup providers properly in starter
export function ScreenProvider({ children }: Props) {
	const [fw, setFw] = useState<boolean>(false)
	const [d, setD] = useState<boolean>(false)
	const [t, setT] = useState<boolean>(false)
	const [m, setM] = useState<boolean>(false)

	useEffect(() => {
		if (isBrowser()) {
			const setScreenContext = () => {
				startTransition(() => {
					setM(window.innerWidth <= mobile)
					setT(window.innerWidth > mobile && window.innerWidth <= tablet)
					setD(window.innerWidth > tablet && window.innerWidth <= desktop)
					setFw(window.innerWidth > desktop)
				})
			}

			setScreenContext()

			return addDebouncedEventListener(window, "resize", setScreenContext, 100)
		}
	}, [])

	const screenValue = useMemo(() => {
		return { fullWidth: fw, desktop: d, tablet: t, mobile: m }
	}, [d, fw, t, m])

	return (
		<ScreenContext.Provider value={screenValue}>
			{children}
		</ScreenContext.Provider>
	)
}
