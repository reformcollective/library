import { useEffect, useState } from "react"

import { isBrowser } from "./deviceDetection"

const useCanHover = () => {
	const [canHover, setCanHover] = useState(true)

	useEffect(() => {
		if (!isBrowser) return
		// query should match if the device is incapable of hovering
		const mediaQuery = window.matchMedia("(hover: none)")
		const updateCanHover = () => setCanHover(!mediaQuery.matches)
		updateCanHover()
		mediaQuery.addEventListener("change", updateCanHover)
		return () => mediaQuery.removeEventListener("change", updateCanHover)
	}, [])

	return canHover
}

export default useCanHover
