"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import type {
	ControllerInternals,
	VideoInViewTrigger,
	VideoProvider,
} from "library/videos/types"
import type { VideoLogger } from "library/videos/debug"
import { createVideoSlot, type VideoSlot } from "./concurrency"
import { observeShared } from "./sharedObserver"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

function subscribeReducedMotion(onChange: () => void) {
	const query = window.matchMedia(REDUCED_MOTION)
	query.addEventListener("change", onChange)
	return () => query.removeEventListener("change", onChange)
}

export function usePrefersReducedMotion() {
	return useSyncExternalStore(
		subscribeReducedMotion,
		() => window.matchMedia(REDUCED_MOTION).matches,
		() => false,
	)
}

interface ConnectionLike extends EventTarget {
	saveData?: boolean
	effectiveType?: string
}

function getConnection(): ConnectionLike | null {
	const nav: Navigator & { connection?: ConnectionLike } = navigator
	return nav.connection ?? null
}

function subscribeDataSaver(onChange: () => void) {
	const connection = getConnection()
	connection?.addEventListener("change", onChange)
	return () => connection?.removeEventListener("change", onChange)
}

function readDataSaver() {
	const connection = getConnection()
	if (!connection) return false
	const type = connection.effectiveType
	return connection.saveData === true || type === "2g" || type === "slow-2g"
}

export function useDataSaver() {
	return useSyncExternalStore(subscribeDataSaver, readDataSaver, () => false)
}

/** Latches true once the element comes within `margin` of the viewport. */
export function useNearViewport(
	target: HTMLElement | null,
	margin: string,
	enabled: boolean,
) {
	const [near, setNear] = useState(false)
	useEffect(() => {
		if (!enabled || !target) return
		return observeShared(target, { rootMargin: margin }, (entry) => {
			if (entry.isIntersecting) setNear(true)
		})
	}, [target, margin, enabled])
	return near
}

interface TriggerArgs {
	target: HTMLElement | null
	controller: ControllerInternals
	provider: VideoProvider
	options: VideoInViewTrigger | null
	suppressed: boolean
	maxConcurrent: number
	log?: VideoLogger
}

/** Wires the built-in play trigger: intersecting, tab visible, no reduced motion or data saver, concurrency slot free. */
export function useInViewTrigger({
	target,
	controller,
	provider,
	options,
	suppressed,
	maxConcurrent,
	log,
}: TriggerArgs) {
	const threshold = options?.threshold ?? 0.1
	const thresholdKey = Array.isArray(threshold)
		? threshold.join(",")
		: String(threshold)
	const rootMargin = options?.rootMargin ?? "0px"
	const once = options?.once ?? false
	const pauseWhenOut = options?.pauseWhenOut ?? true
	const enabled = options !== null && !suppressed

	useEffect(() => {
		if (!enabled || !target) return
		let intersecting = false
		let playedOnce = false
		let lastOrigin = controller.getState().wantedOrigin
		let lastStatus = controller.getState().status
		const slot: VideoSlot = createVideoSlot(
			provider,
			maxConcurrent,
			() => {
				if (controller.triggerClaimed) {
					slot.release()
					return
				}
				if (controller.getState().wantedOrigin === "manual") {
					log?.("slot granted but skipped, manual control")
					slot.release()
					return
				}
				if (controller.getState().status === "ended") {
					slot.release()
					return
				}
				playedOnce = true
				controller.playFromTrigger()
			},
			log,
		)

		const evaluate = () => {
			if (controller.triggerClaimed) {
				slot.release()
				return
			}
			const visible = document.visibilityState === "visible"
			if (intersecting && visible) {
				if (once && playedOnce) return
				slot.request()
				return
			}
			slot.release()
			if (pauseWhenOut || !visible) controller.pauseFromTrigger()
		}

		const thresholds = thresholdKey.split(",").map(Number)
		const minThreshold = Math.min(...thresholds)
		const unobserve = observeShared(
			target,
			{ rootMargin, threshold: thresholds },
			(entry) => {
				intersecting =
					entry.isIntersecting && entry.intersectionRatio >= minThreshold
				evaluate()
			},
		)
		const onVisibility = () => evaluate()
		const onPageShow = (event: PageTransitionEvent) => {
			if (event.persisted) evaluate()
		}
		document.addEventListener("visibilitychange", onVisibility)
		window.addEventListener("pageshow", onPageShow)
		let lastClaimed = controller.triggerClaimed
		const unsubscribe = controller.subscribe(() => {
			const claimed = controller.triggerClaimed
			const claimChanged = claimed !== lastClaimed
			lastClaimed = claimed
			if (claimed) {
				slot.release()
				return
			}
			if (claimChanged) {
				evaluate()
				return
			}
			const state = controller.getState()
			const origin = state.wantedOrigin
			const released = lastOrigin === "manual" && origin === null
			lastOrigin = origin
			const recovered = lastStatus === "error" && state.status !== "error"
			lastStatus = state.status
			if (state.status === "ended" || state.status === "error" || origin === "manual")
				slot.release()
			else if (released || recovered) evaluate()
		})

		return () => {
			unobserve()
			unsubscribe()
			document.removeEventListener("visibilitychange", onVisibility)
			window.removeEventListener("pageshow", onPageShow)
			slot.release()
		}
	}, [
		enabled,
		target,
		controller,
		provider,
		maxConcurrent,
		thresholdKey,
		rootMargin,
		once,
		pauseWhenOut,
		log,
	])
}
