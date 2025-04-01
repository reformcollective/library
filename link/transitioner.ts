import { ScrollTrigger } from "gsap/all"
import { createScrollLock } from "library/Scroll"
import { pathnameMatches, sleep } from "library/functions"
import libraryConfig from "libraryConfig"
import type { MouseEvent } from "react"
import { useCallback } from "react"
import { loader } from "./loader"
import { getScrollOffset } from "./util"

export const useTransitioner = () => {
	return useCallback(
		async ({
			e,
			to,
			transition,
		}: {
			e: MouseEvent
			to: string
			transition?: unknown
		}) => {
			const destination = new URL(to, window.location.origin)

			/**
			 * ONLY SCROLLING
			 *
			 * if we're already on the page we're trying to load, just scroll to the top ( or to anchor )
			 */
			if (
				to.startsWith("#") ||
				pathnameMatches(destination.pathname, window.location.pathname)
			) {
				e.preventDefault()
				const scrollLock = createScrollLock("unlock")

				// save the anchor to the URL
				if (libraryConfig.saveAnchorNames)
					window.history.replaceState({}, "", to)

				// scroll to anchor if applicable, otherwise scroll to top
				if (destination.hash) {
					const scrollOffset = getScrollOffset(destination.hash)
					window.lenis?.scrollTo(destination.hash, {
						offset: scrollOffset,
						onComplete: scrollLock.release,
					})
					loader.dispatchEvent("scroll", destination.hash)
				} else {
					window.lenis?.scrollTo(0, {
						onComplete: scrollLock.release,
					})
					loader.dispatchEvent("scroll", null)
				}

				return
			}

			/**
			 * INSTANT TRANSITION
			 *
			 * if no transition is specified, instantly transition pages
			 */
			if (transition === "instant" || !transition) {
				loader.dispatchEvent("start", "instant")

				const existingHref = window.location.href

				// check for href changes with a timeout
				const timeout = new Promise((_, reject) =>
					setTimeout(() => reject(new Error("Navigation timeout")), 30_000),
				)
				const urlChange = new Promise<void>((resolve) => {
					const checkUrlChange = () => {
						if (window.location.href !== existingHref) {
							resolve()
							clearInterval(interval)
						}
					}
					const interval = setInterval(checkUrlChange, 5)
				})
				await Promise.race([timeout, urlChange])
				await sleep(10)
				window.lenis?.scrollTo(0, { immediate: true })
				ScrollTrigger.refresh()

				loader.dispatchEvent("routeChange", "instant")
				loader.dispatchEvent("end", "instant")

				return
			}

			/**
			 * NORMAL TRANSITION
			 */
			throw new Error("we haven't added support for this yet -robbie")
		},
		[],
	)
}
