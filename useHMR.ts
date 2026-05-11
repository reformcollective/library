import { useEventListener } from "ahooks"
import { dispatcher } from "next/dist/compiled/next-devtools"
import type { Dispatcher } from "next/dist/next-devtools/dev-overlay.browser"
import { use, useEffect, useEffectEvent, useRef } from "react"
import { ScreenContext } from "./ScreenContext"
import TypedEventEmitter from "./TypedEventEmitter"

const nextDispatcher = dispatcher as Dispatcher

const refreshScrollStorageKey = "__reformSteadyHotScrollLatestScroll"
const reloadScrollStorageKey = "__reformSteadyHotScrollLatestScrollBeforeReload"
const refreshedAtStorageKey = "__reformSteadyHotScrollRefreshedAt"
let hmrMessageId = 0

const createHMRMessageId = () =>
	`${Date.now().toString(36)}-${(hmrMessageId++).toString(36)}-${Math.random().toString(36).slice(2)}`

const emitter = new TypedEventEmitter<{
	beforeRefresh: [string]
	afterRefresh: [string]
}>()

const previousOnBeforeRefresh = nextDispatcher.onBeforeRefresh
const previousOnRefresh = nextDispatcher.onRefresh
nextDispatcher.onBeforeRefresh = () => {
	previousOnBeforeRefresh()
	emitter.dispatchEvent("beforeRefresh", createHMRMessageId())
}
nextDispatcher.onRefresh = () => {
	previousOnRefresh()
	emitter.dispatchEvent("afterRefresh", createHMRMessageId())
}

const setSavedScroll = (key: string, scroll: number | null) => {
	if (scroll === null) sessionStorage.removeItem(key)
	else sessionStorage.setItem(key, String(scroll))
}

const getSavedScroll = (key: string) => {
	const scroll = sessionStorage.getItem(key)
	if (scroll === null) return null
	return Number.parseInt(scroll, 10)
}

const setRefreshedAt = () => {
	sessionStorage.setItem(refreshedAtStorageKey, String(Date.now()))
}

const getRefreshedAt = () => {
	const refreshedAt = sessionStorage.getItem(refreshedAtStorageKey)
	if (refreshedAt === null) return null
	return Number.parseInt(refreshedAt, 10)
}

export const useHMR =
	process.env.NODE_ENV === "development"
		? (
				type: "beforeRefresh" | "afterRefresh" | "beforeReload" | "afterReload",
				callback: (hash: string) => void,
			) => {
				const sendMessage = useEffectEvent(callback)
				const { initComplete } = use(ScreenContext)

				useEffect(() => {
					const before = () => {
						if (type === "beforeRefresh") sendMessage(createHMRMessageId())
					}
					const after = () => {
						if (type === "afterRefresh") sendMessage(createHMRMessageId())
					}

					if (type === "beforeRefresh")
						emitter.addEventListener("beforeRefresh", before)
					if (type === "afterRefresh")
						emitter.addEventListener("afterRefresh", after)
					return () => {
						emitter.removeEventListener("beforeRefresh", before)
						emitter.removeEventListener("afterRefresh", after)
					}
				}, [type])

				useEventListener("beforeunload", () => {
					setRefreshedAt()
					if (type === "beforeReload") sendMessage(createHMRMessageId())
				})

				useEffect(() => {
					if (type !== "afterReload") return
					const refreshedAt = getRefreshedAt()
					// if refreshed in last 10 seconds, assume it's from an HMR-triggered reload and emit
					if (initComplete && refreshedAt && Date.now() - refreshedAt < 10000) {
						sendMessage(createHMRMessageId())
					}
				}, [type, initComplete])
			}
		: () => {}

const useSteadyHotScroll =
	process.env.NODE_ENV === "development"
		? () => {
				const refreshRaf = useRef<number | null>(null)
				const reloadRaf = useRef<number | null>(null)

				useHMR("beforeRefresh", () => {
					if (refreshRaf.current) cancelAnimationFrame(refreshRaf.current)
					setSavedScroll(refreshScrollStorageKey, window.scrollY)
				})

				useHMR("afterRefresh", () => {
					const savedScroll = getSavedScroll(refreshScrollStorageKey)
					if (savedScroll !== null) {
						refreshRaf.current = requestAnimationFrame(() => {
							window.scrollTo(0, savedScroll)
							setSavedScroll(refreshScrollStorageKey, null)
						})
					}
				})

				useHMR("beforeReload", () => {
					if (reloadRaf.current) cancelAnimationFrame(reloadRaf.current)
					setSavedScroll(reloadScrollStorageKey, window.scrollY)
				})

				useHMR("afterReload", () => {
					const savedScroll = getSavedScroll(reloadScrollStorageKey)
					if (savedScroll !== null) {
						reloadRaf.current = requestAnimationFrame(() => {
							window.scrollTo(0, savedScroll)
							setSavedScroll(reloadScrollStorageKey, null)
						})
					}
				})
			}
		: () => {}

export function SteadyHotScroll() {
	useSteadyHotScroll()
	return null
}
