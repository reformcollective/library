import { ScrollTrigger } from "gsap/all"
import { createScrollLock } from "library/Scroll"
import { pathnameMatches, sleep } from "library/functions"
import libraryConfig from "libraryConfig"
import type { MouseEvent } from "react"
import { use, useCallback } from "react"
import { loader } from "./loader"
import { getScrollOffset } from "./util"
import { TransitionsContext } from "./usePageTransition"
import { useRouter } from "next/navigation"
import { flushSync } from "react-dom"

// at some point I might re-add support for different transitions (like on newform) but not really needed for now

export const useTransitioner = () => {
	const { animations, setIsAnimating } = use(TransitionsContext)
	const router = useRouter()

	return useCallback(
		async ({ e, to }: { e: MouseEvent; to: string }) => {
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
			 * TRANSITION TO A NEW PAGE
			 *
			 * both instant and animated transitions
			 */
			const isInstant = animations.size === 0
			const allAnimations = Array.from(animations)
			e.preventDefault()
			router.prefetch(to)

			loader.dispatchEvent("start", isInstant ? "instant" : "animated")

			flushSync(() => {
				setIsAnimating(true)
			})

			const beforeAnimations = allAnimations.map(({ animateBefore }) =>
				animateBefore?.(),
			)
			await Promise.allSettled(beforeAnimations)

			router.push(to, { scroll: false })

			// check for href changes with a timeout
			const existingHref = window.location.href
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

			loader.dispatchEvent("routeChange", isInstant ? "instant" : "animated")
			document.body.inert = true // prevent navigation before we're done animating in

			if (!isInstant) await sleep(10)
			const afterAnimations = allAnimations.map(({ animateAfter }) =>
				animateAfter?.(),
			)
			await Promise.allSettled(afterAnimations)

			flushSync(() => {
				setIsAnimating(false)
			})

			document.body.inert = false
			loader.dispatchEvent("end", isInstant ? "instant" : "animated")

			return
		},
		[animations, setIsAnimating, router],
	)
}
