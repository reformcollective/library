import { useEventListener } from "ahooks"
import { dispatcher } from "next/dist/compiled/next-devtools"
import type { Dispatcher } from "next/dist/next-devtools/dev-overlay.browser"
import { use, useEffect, useEffectEvent } from "react"
import { ScreenContext } from "./ScreenContext"
import TypedEventEmitter from "./TypedEventEmitter"

const nextDispatcher = dispatcher as Dispatcher

const refreshScrollStorageKey = "__reformSteadyHotScrollLatestScroll"
const reloadScrollStorageKey = "__reformSteadyHotScrollLatestScrollBeforeReload"
const refreshedAtStorageKey = "__reformSteadyHotScrollRefreshedAt"

const emitter = new TypedEventEmitter<{
	beforeRefresh: [string]
	afterRefresh: [string]
}>()

const previousOnBeforeRefresh = nextDispatcher.onBeforeRefresh
const previousOnRefresh = nextDispatcher.onRefresh
nextDispatcher.onBeforeRefresh = () => {
	previousOnBeforeRefresh()
	emitter.dispatchEvent("beforeRefresh", crypto.randomUUID())
}
nextDispatcher.onRefresh = () => {
	previousOnRefresh()
	emitter.dispatchEvent("afterRefresh", crypto.randomUUID())
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
				debug?: string,
			) => {
				const sendMessage = useEffectEvent(callback)
				const { initComplete } = use(ScreenContext)

				useEffect(() => {
					const before = () => {
						previousOnBeforeRefresh()
						if (type === "beforeRefresh") sendMessage(crypto.randomUUID())
					}
					const after = () => {
						previousOnRefresh()
						if (type === "afterRefresh") sendMessage(crypto.randomUUID())
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
					if (type === "beforeReload") sendMessage(crypto.randomUUID())
				})

				useEffect(() => {
					if (type !== "afterReload") return
					const refreshedAt = getRefreshedAt()
					// if refreshed in last 10 seconds, assume it's from an HMR-triggered reload and emit
					if (initComplete && refreshedAt && Date.now() - refreshedAt < 10000) {
						sendMessage(crypto.randomUUID())
					}
				}, [type, initComplete])
			}
		: () => {}

const useSteadyHotScroll =
	process.env.NODE_ENV === "development"
		? () => {
				let refreshRaf: number | null = null
				let reloadRaf: number | null = null

				useHMR(
					"beforeRefresh",
					() => {
						if (refreshRaf) cancelAnimationFrame(refreshRaf)
						setSavedScroll(refreshScrollStorageKey, window.scrollY)
					},
					"use steady",
				)

				useHMR("afterRefresh", () => {
					const savedScroll = getSavedScroll(refreshScrollStorageKey)
					if (savedScroll !== null) {
						refreshRaf = requestAnimationFrame(() => {
							window.scrollTo(0, savedScroll)
							setSavedScroll(refreshScrollStorageKey, null)
						})
					}
				})

				useHMR("beforeReload", () => {
					if (reloadRaf) cancelAnimationFrame(reloadRaf)
					setSavedScroll(reloadScrollStorageKey, window.scrollY)
				})

				useHMR("afterReload", () => {

					const savedScroll = getSavedScroll(reloadScrollStorageKey)
					if (savedScroll !== null) {
						reloadRaf = requestAnimationFrame(() => {
							window.scrollTo(0, savedScroll)
							setSavedScroll(refreshScrollStorageKey, null)
						})
					}
				})
			}
		: () => {}

export function SteadyHotScroll() {
	useSteadyHotScroll()
	return null
}
