import { useEffect } from "react"

import { isBrowser } from "./functions"

export default function useCSSHeightVariables() {
	useEffect(() => {
		// add a 100vh css variable to the root element
		const update = () => {
			const vh = isBrowser() ? `${window.innerHeight}px` : "100vh"
			const oneVh = isBrowser() ? `${window.innerHeight * 0.01}px` : "1vh"
			document.documentElement.style.setProperty("--vh", oneVh)
			document.documentElement.style.setProperty("--hundred-vh", vh)
		}
		update()
		window.addEventListener("resize", update)
		return () => window.removeEventListener("resize", update)
	})
}
