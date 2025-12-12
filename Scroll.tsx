import { gsap, ScrollTrigger } from "gsap/all"
import type Lenis from "lenis"
import type { LenisOptions } from "lenis"
import "lenis/dist/lenis.css"
import { type LenisRef, ReactLenis, useLenis } from "lenis/react"
import { useEffect, useState } from "react"
import { isBrowser } from "./deviceDetection"
import TypedEventEmitter from "./TypedEventEmitter"

const locks: symbol[] = []
const locksChange = new TypedEventEmitter<{ change: [] }>()

export const refreshScrollLocks = () => {
	locksChange.dispatchEvent("change")
}

export { useLenis }

/**
 * lock and unlock the scroller, without interfering with other tools that also lock the scroller
 *
 * you can can either lock the scrolling
 * or force to unlock scrolling (even if locks exist)
 */
export const createScrollLock = (type: "lock" | "unlock" = "lock") => {
	const lockId = Symbol(`scroll-${type}`)

	locks.push(lockId)
	locksChange.dispatchEvent("change")

	return {
		/**
		 * you can call this multiple times without issue if it's more convenient
		 */
		release: () => {
			const index = locks.indexOf(lockId)

			if (index >= 0) {
				locks.splice(index, 1)
				locksChange.dispatchEvent("change")
			}
		},
	}
}

/**
 * lock and unlock the scroller, without interfering with other tools that also lock the scroller
 * plus some react state sugar for scroll locking to make it easier to use
 * locks are also automatically released on unmount
 *
 * you can can either lock the scrolling
 * or force to unlock scrolling (even if locks exist)
 *
 * you can also set the value via the second argument if you have external state
 */
export const useScrollLock = (
	type: "lock" | "unlock" = "lock",
	value?: boolean,
) => {
	const [locked, setLocked] = useState(false)
	const shouldLock = value ?? locked

	useEffect(() => {
		if (shouldLock) {
			const lock = createScrollLock(type)

			return () => lock.release()
		}
	}, [type, shouldLock])

	return [locked, setLocked] as const
}

/**
 * shorthand for pins, which selects "fixed" if scroller is off and "transform"
 * if scroller is on
 */
export const usePinType = () => {
	const isSmooth = useIsSmooth()
	return isSmooth ? "transform" : "fixed"
}

/**
 * returns true if scroll smoothing is enabled
 */
export const useIsSmooth = () => {
	const [smooth, setSmooth] = useState(
		typeof window !== "undefined" &&
			window.matchMedia("(hover: hover)").matches,
	)

	useEffect(() => {
		if (!isBrowser) return

		let isMounted = true

		const updateFromLenis = () => {
			const lenis = window.lenis
			if (!lenis) return

			const state = window.lenis?.isScrolling

			if (state === "smooth") {
				if (isMounted) setSmooth(true)
			} else if (state === "native") {
				if (isMounted) setSmooth(false)
			}
		}

		updateFromLenis()

		const lenis = window.lenis
		lenis?.on("scroll", updateFromLenis)

		return () => {
			isMounted = false
			lenis?.off("scroll", updateFromLenis)
		}
	}, [])

	return smooth
}

declare global {
	interface Window {
		lenis?: Lenis
	}
}

ScrollTrigger.config({
	ignoreMobileResize: true,
})

export const SmoothScrollStyle = (config: LenisOptions) => {
	const [lenis, setLenis] = useState<Lenis | undefined>(undefined)

	useEffect(() => {
		function update(time: number) {
			lenis?.raf(time * 1000)
		}

		gsap.ticker.add(update)

		return () => gsap.ticker.remove(update)
	}, [lenis])

	useEffect(() => {
		window.lenis = lenis
		if (!lenis) return

		let needsRefresh = false
		let isMounted = true

		const onResize = () => {
			needsRefresh = true
		}

		const check = () => {
			if (!isMounted) return
			if (needsRefresh && lenis.velocity === 0) {
				needsRefresh = false
				ScrollTrigger.refresh()
			}
			requestAnimationFrame(check)
		}
		requestAnimationFrame(check)

		const onChange = () => {
			const unlockers = locks.find(
				(lock) => lock.description === "scroll-unlock",
			)
			const lockers = locks.find((lock) => lock.description === "scroll-lock")

			if (unlockers) lenis.start()
			else if (lockers) lenis.stop()
			else lenis.start()
		}

		onChange()

		locksChange.addEventListener("change", onChange)
		window.addEventListener("resize", onResize)

		return () => {
			isMounted = false
			locksChange.removeEventListener("change", onChange)
			window.removeEventListener("resize", onResize)
		}
	}, [lenis])

	return (
		<ReactLenis
			root
			ref={(ref: LenisRef) => {
				if (ref?.lenis !== lenis) ref?.lenis?.stop()
				setLenis(ref?.lenis)
			}}
			options={{
				...config,
				autoRaf: false,
			}}
		/>
	)
}
