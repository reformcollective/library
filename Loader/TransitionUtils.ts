import { useDeepCompareEffect, useEventListener } from "ahooks"
import gsap from "gsap"
import ScrollSmoother from "gsap/ScrollSmoother"
import ScrollToPlugin from "gsap/ScrollToPlugin"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { createScrollLock } from "library/Scroll"
import { linkIsExternal, pathnameMatches, sleep } from "library/functions"
import { pageReady, pageUnmounted } from "library/pageReady"
import type { TransitionNames } from "libraryConfig"
import libraryConfig from "libraryConfig"
import { loader } from "."
import { getLoaderIsDone } from "./PreloaderUtils"
import { allLoaderPromisesSettled } from "./promises"
import { getScrollOffset, scrollToAnchor } from "./scrollToAnchor"

gsap.registerPlugin(ScrollToPlugin)

type LoaderTransitions = TransitionNames | "instant"
interface Animation {
	callback: VoidFunction
	duration: number
}

/**
 * all registered transitions
 */
const allTransitions: Record<
	string,
	{
		inAnimation: Animation[]
		outAnimation: Animation[]
	}
> = {}

/**
 * if we click a link during a transition, delay it until the transition is done
 */
let pendingNavigation: {
	to: string
	transition?: LoaderTransitions
} | null = null

/**
 * and likewise, the currently running navigation
 */
let currentNavigation: string | null = null

/**
 * load a page, making use of the specified transition
 * @param navigateTo page to load
 * @param transition the transition to use
 */
export const loadPage = async ({
	to: navigateTo,
	transition,
	routerNavigate,
}: {
	to: string
	transition: LoaderTransitions
	routerNavigate: (to: string) => unknown
}) => {
	const anchorName = new URL(navigateTo, window.location.origin).hash
	const pathname = new URL(navigateTo, window.location.origin).pathname

	// if a transition is already in progress, wait for it to finish before loading the next page
	if (currentNavigation !== null) {
		// ignore double clicks
		if (!pathnameMatches(pathname, currentNavigation))
			pendingNavigation = { to: navigateTo, transition }
		return
	}

	/**
	 * ONLY SCROLLING
	 *
	 * if we're already on the page we're trying to load, just scroll to the top ( or to anchor )
	 */
	if (
		navigateTo.startsWith("#") ||
		pathnameMatches(pathname, window.location.pathname)
	) {
		const scrollLock = createScrollLock("unlock")

		// save the anchor to the URL
		if (libraryConfig.saveAnchorNames)
			window.history.replaceState({}, "", navigateTo)

		// scroll to anchor if applicable, otherwise scroll to top
		const scrollTo = (smooth: boolean) => {
			if (anchorName) {
				const scrollOffset = getScrollOffset(anchorName)
				ScrollSmoother.get()?.scrollTo(
					anchorName,
					smooth,
					`top top+=${scrollOffset}`,
				)
				loader.dispatchEvent("scroll", anchorName)
			} else {
				ScrollSmoother.get()?.scrollTo(0, smooth)
				loader.dispatchEvent("scroll", null)
			}
		}

		scrollTo(true)
		const smooth = ScrollSmoother.get()?.smooth() ?? 0
		gsap.delayedCall(smooth, () => {
			scrollLock.release()

			if (ScrollSmoother.get()?.paused()) {
				ScrollSmoother.get()?.paused(false)
				scrollTo(false)
				ScrollSmoother.get()?.paused(true)
			}
		})

		return
	}

	/**
	 * INSTANT TRANSITION
	 *
	 * if no transition is specified, instantly transition pages
	 */
	if (transition === "instant" || !transition || !allTransitions[transition]) {
		loader.dispatchEvent("start", "instant")
		loader.dispatchEvent("routeChange", "instant")

		navigate({ to: navigateTo, routerNavigate })
		await pageUnmounted()
		await pageReady()

		const scrollLock = createScrollLock("unlock")

		// scroll to anchor if applicable, otherwise scroll to top
		if (anchorName) {
			await scrollToAnchor(anchorName)
		} else {
			ScrollSmoother.get()?.scrollTo(0, false)
			window.scrollTo(0, 1)
		}

		scrollLock.release()

		loader.dispatchEvent("end", "instant")
		return
	}

	/**
	 * NORMAL TRANSITION
	 */
	currentNavigation = navigateTo

	// wait for the preloader to finish animation before starting the transition
	while (!getLoaderIsDone()) await sleep(100)

	const animationContext = gsap.context(() => {
		// we need to pass a function in order to create a new context
	})
	const enterAnimations = allTransitions[transition]?.inAnimation ?? []

	// run each animation, add it to the context, and get the duration of the longest one
	let entranceDuration = 0
	for (const animation of enterAnimations) {
		const { callback, duration: animationDuration } = animation
		animationContext.add(callback)
		entranceDuration = Math.max(entranceDuration, animationDuration)
	}

	// dispatch events
	loader.dispatchEvent("start", transition)

	// wait for entrance animation to finish
	await sleep(entranceDuration * 1000)
	loader.dispatchEvent("routeChange", transition)
	const scrollLock = createScrollLock()

	// actually navigate to the page
	await navigate({
		to: navigateTo,
		routerNavigate,
		cleanupFunction: () => {
			animationContext.revert()
		},
	})
	await pageUnmounted()
	await pageReady()

	// wait for any promises to settle
	await sleep(0)
	await allLoaderPromisesSettled()

	// if the desired behavior is to scroll to a certain point on the page
	// after the transition, do so. This is done after the exit animation
	// to prevent the page from jumping around
	if (anchorName) {
		await scrollToAnchor(anchorName)
	} else {
		// if no anchor, scroll to the top of the page
		window.scrollTo(0, 0)
		ScrollSmoother.get()?.scrollTo(0, false)
	}

	const exitAnimations = allTransitions[transition]?.outAnimation ?? []

	// run each animation, add it to the context, and get the duration of the longest one
	let exitDuration = 0
	for (const animation of exitAnimations) {
		const { callback, duration: animationDuration } = animation
		animationContext.add(callback)
		exitDuration = Math.max(exitDuration, animationDuration)
	}

	// wait for exit animation to finish
	await sleep(exitDuration * 1000 + 10)

	// dispatch finished events
	loader.dispatchEvent("end", transition)
	scrollLock.release()
	ScrollTrigger.refresh()

	// cleanup and reset
	animationContext.revert()
	currentNavigation = null

	// start the next transition if applicable
	if (pendingNavigation?.transition) {
		loadPage({
			to: pendingNavigation.to,
			transition: pendingNavigation.transition,
			routerNavigate,
		})
		pendingNavigation = null
	}
}

/**
 * navigate to an external or internal link without a transition
 * @param to the link to navigate to
 * @param cleanupFunction a function to reset the page to its original state (if back button is pressed after external link)
 */
const navigate = async ({
	to,
	routerNavigate,
	cleanupFunction,
}: {
	to: string
	routerNavigate: (to: string) => unknown
	cleanupFunction?: VoidFunction
}) => {
	const isExternal = linkIsExternal(to)

	if (isExternal) {
		window.open(to)

		// if the user presses the back button after navigation, we'll need to cleanup any animations
		setTimeout(() => {
			cleanupFunction?.()
		}, 1000)
	} else {
		const destination = new URL(to, window.location.origin)

		// scrub the hash from the URL if needed
		if (!libraryConfig.saveAnchorNames) {
			destination.hash = ""
		}

		routerNavigate(destination.pathname + destination.search + destination.hash)
	}
}

/**
 * manually track the scroll position so we can restore it when clicking back
 * gatsby can't restore scroll position if we have a transition animation
 */
const scrollPositions = new Map<string, number>()

/**
 * handles scroll restoration for forward/back buttons
 * will also dispatch events to make sure nothing gets stuck in an illegal state
 */
export function useBackButton() {
	useEventListener("scroll", () => {
		scrollPositions.set(window.location.href, window.scrollY)
	})

	useEventListener("popstate", async () => {
		loader.dispatchEvent("start", "instant")
		loader.dispatchEvent("routeChange", "instant")
		document.body.style.minHeight = "9999vh"

		await pageUnmounted()
		await pageReady()

		if (libraryConfig.scrollRestoration === false) window.scrollTo(0, 1)
		else window.scrollTo(0, scrollPositions.get(window.location.href) ?? 0)

		// using back then forward can cause page to disappear until we scroll, so we'll do that manually
		window.scrollBy(0, 1)
		await sleep(500)
		loader.dispatchEvent("end", "instant")
		document.body.style.removeProperty("min-height")
	})
}

/**
 * registers a transition that can be run with a UniversalLink or by using loadPage.
 *
 * @param name the name of the transition
 * @param details
 * @param details.in the animation to run before navigating
 * @param details.out the animation to run after navigating
 * @param details.inDuration the duration of the in animation in seconds
 * @param details.outDuration the duration of the out animation in seconds
 */
export const usePageTransition = (
	name: Exclude<LoaderTransitions, "instant">,
	details: {
		in: VoidFunction
		out: VoidFunction
		inDuration: number
		outDuration: number
	},
) => {
	useDeepCompareEffect(() => {
		const {
			in: inAnimation,
			out: outAnimation,
			inDuration,
			outDuration,
		} = details

		// merge the new details into the existing animation of this name
		const previous = allTransitions[name] ?? {
			inAnimation: [],
			outAnimation: [],
		}

		allTransitions[name] = {
			inAnimation: [
				...previous.inAnimation,
				{ callback: inAnimation, duration: inDuration },
			],
			outAnimation: [
				...previous.outAnimation,
				{ callback: outAnimation, duration: outDuration },
			],
		}

		return () => {
			const callbacksToRemove = [inAnimation, outAnimation]

			const previous = allTransitions[name] ?? {
				inAnimation: [],
				outAnimation: [],
			}

			allTransitions[name] = {
				inAnimation: previous.inAnimation.filter(
					({ callback }) => !callbacksToRemove.includes(callback),
				),
				outAnimation: previous.outAnimation.filter(
					({ callback }) => !callbacksToRemove.includes(callback),
				),
			}
		}
	}, [name, details])
}
