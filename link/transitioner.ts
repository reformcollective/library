import { pathnameMatches, sleep } from "library/functions"
import { createScrollLock } from "library/Scroll"
import libraryConfig from "libraryConfig"
import { useTransitionRouter } from "next-view-transitions"
import { useRouter } from "next/navigation"
import type { RouteLiteral } from "nextjs-routes"
import { useCallback } from "react"
import { loader, type Transitions } from "./loader"
import { getScrollOffset } from "./util"
import { ScrollTrigger } from "gsap/all"

export const useTransitioner = () => {
	const plainRouter = useRouter()
	const transitionRouter = useTransitionRouter()

	return useCallback(
		async (to: string, transition?: Transitions) => {
			const destination = new URL(to, window.location.origin)
			const transitionFunction =
				libraryConfig.viewTransitions[
					transition as keyof typeof libraryConfig.viewTransitions
				]

			/**
			 * ONLY SCROLLING
			 *
			 * if we're already on the page we're trying to load, just scroll to the top ( or to anchor )
			 */
			if (
				to.startsWith("#") ||
				pathnameMatches(destination.pathname, window.location.pathname)
			) {
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
				plainRouter.push(
					(destination.pathname +
						destination.search +
						destination.hash) as unknown as RouteLiteral,
				)

				// check for href changes with a timeout
				const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Navigation timeout")), 5000));
				const urlChange = new Promise((resolve) => {
					const checkUrlChange = () => {
						if (window.location.href !== existingHref) {
							resolve();
							clearInterval(interval);
						}
					};
					const interval = setInterval(checkUrlChange, 5);
				});
				await Promise.race([timeout, urlChange]);
				loader.dispatchEvent("routeChange", "instant")
				loader.dispatchEvent("end", "instant")

				return
			}

			/**
			 * NORMAL TRANSITION
			 */

			// dispatch events
			loader.dispatchEvent("start", transition)

			// actually navigate to the page
			const existingHref = window.location.href
			transitionRouter.push(
				(destination.pathname +
					destination.search +
					destination.hash) as unknown as RouteLiteral,
				{
					onTransitionReady: transitionFunction,
				},
			)

			// check for href changes
			while (window.location.href === existingHref) {
				await sleep(5)
			}
			loader.dispatchEvent("routeChange", transition)

			// dispatch finished events
			loader.dispatchEvent("end", transition)
			ScrollTrigger.refresh()
		},
		[plainRouter, transitionRouter],
	)
}
