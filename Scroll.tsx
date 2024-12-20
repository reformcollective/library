"use client"

import { ScrollTrigger, gsap } from "gsap/all"
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react"
import TypedEventEmitter from "./TypedEventEmitter"
import { isBrowser } from "./deviceDetection"
import Lenis from "lenis"

import "lenis/dist/lenis.css"
import { pathnameMatches } from "./functions"
import { studioUrl } from "@/sanity/lib/api"

const locks: symbol[] = []
const locksChange = new TypedEventEmitter<{ change: [] }>()

export const refreshScrollLocks = () => {
	locksChange.dispatchEvent("change")
}

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
		const enableSmooth = () => {
			setSmooth(true)
		}
		const disableSmooth = () => {
			setSmooth(false)
			gsap.set("#smooth-content", { clearProps: "transform" })
		}

		window.addEventListener("wheel", enableSmooth, { passive: true })
		window.addEventListener("touchstart", disableSmooth, { passive: true })

		return () => {
			window.removeEventListener("wheel", enableSmooth)
			window.removeEventListener("touchstart", disableSmooth)
		}
	}, [])

	// if the device is mobile, set the initial value to false
	useEffect(() => {
		const hover = window.matchMedia("(hover: hover)")
		if (!hover.matches) {
			setSmooth(false)
		}
	}, [])

	// check for url flags
	if (isBrowser && window.location.search.toLowerCase().includes("nosmooth"))
		return false
	if (isBrowser && window.location.search.toLowerCase().includes("forcesmooth"))
		return true

	return smooth
}

declare global {
	interface Window {
		lenis?: Lenis
	}
}

export default function Scroll({ children }: { children: ReactNode }) {
	/**
	 * create the smoother
	 */
	useLayoutEffect(() => {
		window.lenis?.destroy()

		// lenis cannot be initialized on the studio
		if (pathnameMatches(window.location.pathname, studioUrl)) {
			if (window.lenis) window.location.reload()
			return
		}

		// Initialize a new Lenis instance for smooth scrolling
		const lenis = new Lenis()
		window.lenis = lenis

		// Synchronize Lenis scrolling with GSAP's ScrollTrigger plugin
		lenis.on("scroll", ScrollTrigger.update)

		// Add Lenis's requestAnimationFrame (raf) method to GSAP's ticker
		// This ensures Lenis's smooth scroll animation updates on each GSAP tick
		gsap.ticker.add((time) => {
			lenis.raf(time * 1000) // Convert time from seconds to milliseconds
		})

		// Disable lag smoothing in GSAP to prevent any delay in scroll animations
		gsap.ticker.lagSmoothing(0)

		/**
		 * pull state from the scroll locks
		 */
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
		return () => {
			locksChange.removeEventListener("change", onChange)
		}
	}, [])

	return <>{children}</>
}
