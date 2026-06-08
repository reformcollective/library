import { useRef } from "react"
import { useHMR } from "./useHMR"

const scrollStorageKey = "__reformSteadyHotScrollLatestScroll"
let logId = 0

const setSavedScroll = (scroll: number | null) => {
	if (scroll === null) sessionStorage.removeItem(scrollStorageKey)
	else sessionStorage.setItem(scrollStorageKey, String(scroll))
}

const getSavedScroll = () => {
	const scroll = sessionStorage.getItem(scrollStorageKey)
	if (scroll === null) return null
	return Number.parseInt(scroll, 10)
}

const getScrollDebugState = () => {
	const scrollingElement = document.scrollingElement ?? document.documentElement
	return {
		scrollY: window.scrollY,
		scrollHeight: scrollingElement.scrollHeight,
		bodyScrollHeight: document.body.scrollHeight,
		viewportHeight: window.innerHeight,
		maxScroll: Math.max(0, scrollingElement.scrollHeight - window.innerHeight),
	}
}

const log = (phase: string, details: Record<string, unknown> = {}) => {
	console.log(
		"[SteadyHotScroll]",
		JSON.stringify({
			id: ++logId,
			phase,
			...details,
			...getScrollDebugState(),
		}),
	)
}

const useSteadyHotScroll =
	process.env.NODE_ENV === "development"
		? () => {
				const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

				useHMR("beforeRefresh", () => {
					if (clearTimerRef.current) {
						clearTimeout(clearTimerRef.current)
						clearTimerRef.current = null
					}
					log("beforeRefresh", { previousSavedScroll: getSavedScroll() })
					setSavedScroll(window.scrollY)
				})

				useHMR("afterRefresh", () => {
					const savedScroll = getSavedScroll()
					log("afterRefresh", { savedScroll })
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
							setSavedScroll(null)
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
