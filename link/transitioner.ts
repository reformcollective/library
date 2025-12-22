import libraryConfig from "app/libraryConfig"
import { ScrollTrigger } from "gsap/all"
import { pathnameMatches, sleep } from "library/functions"
import { createScrollLock } from "library/Scroll"
import { useRouter } from "next/navigation"
import type { MouseEvent } from "react"
import { use, useCallback } from "react"
import { flushSync } from "react-dom"
import { loader } from "./loader"
import { TransitionsContext } from "./usePageTransition"
import { getScrollOffset } from "./util"

const waitForViewTransition = async () => {
	try {
		// @ts-expect-error react internals
		await document.__reactViewTransition.finished
	} catch {
		return Promise.resolve()
	}
}

export const useTransitioner = () => {
	const { animations, setIsAnimating } = use(TransitionsContext)
	const router = useRouter()

	return useCallback(
		async ({
			e,
			to,
			signal,
			transitionName,
		}: {
			/**
			 * the mouse event that triggered the navigation
			 * necessary for preventing default behavior
			 */
			e: MouseEvent | null
			/**
			 * the route to navigate to
			 */
			to: string
			/**
			 * if you want to cancel the navigation, pass an AbortSignal
			 * calling abort will immediately stop execution of the transition
			 * and cancel the next.js navigation without performing any cleanup
			 */
			signal?: AbortSignal
			/**
			 * if applicable, the name of the transition you want to use
			 * this will be passed back to you in the loader events
			 * TODO pass this to usePageTransition
			 */
			transitionName?: (typeof libraryConfig.transitionNames)[number]
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
				e?.preventDefault()
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
			e?.preventDefault()
			router.prefetch(to as Parameters<typeof router.prefetch>[0])
			const onAbort = () => {
				// cancel the in-progress navigation
				window.history.pushState(null, document.title, window.location.href)
			}
			signal?.addEventListener("abort", onAbort)

			const eventPayload = {
				type: isInstant ? "instant" : "animated",
				name: transitionName,
			} as const
			loader.dispatchEvent("start", eventPayload)

			// capture animations before state change so we can detect new ones
			const animationsBeforeBefore = document.body.getAnimations({
				subtree: true,
			})
			flushSync(() => {
				setIsAnimating("before")
			})
			const animationsAfterBefore = document.body.getAnimations({
				subtree: true,
			})
			const newBeforeAnimations = animationsAfterBefore.filter(
				(a) => !animationsBeforeBefore.includes(a),
			)

			const beforeAnimations = allAnimations.map(({ animateBefore }) =>
				animateBefore?.(),
			)
			await Promise.all([
				...beforeAnimations,
				...newBeforeAnimations.map((a) => a.finished),
			])
			if (signal?.aborted) return

			router.push(to as Parameters<typeof router.prefetch>[0])

			// check for href changes with a timeout
			const existingHref = window.location.href
			const timeout = new Promise((_, reject) =>
				setTimeout(() => {
					if (!signal?.aborted) reject(new Error("Navigation timeout"))
				}, 30_000),
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
			await sleep(10) // give the page a moment to render

			window.lenis?.scrollTo(0, { immediate: true })

			// after the page has changed, an abort does nothing
			if (signal?.aborted) return
			signal?.removeEventListener("abort", onAbort)
			ScrollTrigger.refresh()

			loader.dispatchEvent("routeChange", eventPayload)
			document.body.inert = true // prevent navigation before we're done animating in

			if (!isInstant) await sleep(10)

			// capture animations before state change so we can detect new ones
			const animationsBeforeAfter = document.body.getAnimations({
				subtree: true,
			})
			flushSync(() => {
				setIsAnimating("after")
			})
			const animationsAfterAfter = document.body.getAnimations({
				subtree: true,
			})
			const newAfterAnimations = animationsAfterAfter.filter(
				(a) => !animationsBeforeAfter.includes(a),
			)

			const afterAnimations = allAnimations.map(({ animateAfter }) =>
				animateAfter?.(),
			)
			await Promise.all([
				...afterAnimations,
				...newAfterAnimations.map((a) => a.finished),
			])

			flushSync(() => {
				setIsAnimating(false)
			})

			await waitForViewTransition()
			document.body.inert = false
			loader.dispatchEvent("end", eventPayload)

			return
		},
		[animations, setIsAnimating, router],
	)
}
