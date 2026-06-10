import { useCallback, useEffect, useRef } from "react"
import { loader } from "./link/loader"
import { useHMR } from "./useHMR"

const scrollStorageKey = "__reformSteadyHotScrollLatestScroll"

const setSavedScroll = (scroll: number | null) => {
	if (scroll === null) sessionStorage.removeItem(scrollStorageKey)
	else sessionStorage.setItem(scrollStorageKey, String(scroll))
}

const getSavedScroll = () => {
	const scroll = sessionStorage.getItem(scrollStorageKey)
	if (scroll === null) return null
	return Number.parseInt(scroll, 10)
}

const useSteadyHotScroll =
	process.env.NODE_ENV === "development"
		? () => {
				const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
				const clearSavedScroll = useCallback(() => {
					if (clearTimerRef.current) {
						clearTimeout(clearTimerRef.current)
						clearTimerRef.current = null
					}
					setSavedScroll(null)
				}, [])

				useEffect(() => {
					loader.addEventListener("routeChange", clearSavedScroll)
					window.addEventListener("wheel", clearSavedScroll, { passive: true })
					window.addEventListener("touchmove", clearSavedScroll, {
						passive: true,
					})

					return () => {
						loader.removeEventListener("routeChange", clearSavedScroll)
						window.removeEventListener("wheel", clearSavedScroll)
						window.removeEventListener("touchmove", clearSavedScroll)
					}
				}, [clearSavedScroll])

				useHMR("beforeRefresh", () => {
					clearSavedScroll()
					setSavedScroll(window.scrollY)
				})

				useHMR("afterRefresh", () => {
					const savedScroll = getSavedScroll()
					if (savedScroll !== null) {
						if (window.lenisInstance) {
							window.lenisInstance.scrollTo(savedScroll, {
								immediate: true,
								force: true,
							})
						} else {
							window.scrollTo(0, savedScroll)
						}
						if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
						clearTimerRef.current = setTimeout(() => {
							clearSavedScroll()
							clearTimerRef.current = null
						}, 5000)
					}
				})
			}
		: () => {}

export function SteadyHotScroll() {
	useSteadyHotScroll()
	return null
}
