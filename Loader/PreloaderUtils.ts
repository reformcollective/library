import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import libraryConfig from "libraryConfig"

import { createScrollLock } from "library/Scroll"
import { isBrowser } from "library/deviceDetection"
import { useEffect, useRef } from "react"
import { loader } from "."
import { sleep } from "../functions"
import { pageReady } from "../pageReady"
import { allLoaderPromisesSettled } from "./promises"
import { scrollToAnchor } from "./scrollToAnchor"

/**
 * we get a percentage by simply guessing how long the page will take to load based on
 * how long it's taken to load so far
 * the amount of time needed to load the page is pretty arbitrary, so you can adjust this function to fit
 */
const GET_TIME_NEEDED = libraryConfig.getTimeNeeded

/**
 * extra number of milliseconds to wait after the document is ready
 * a higher number gives the percentage based loader more time to reach 100%
 * a value of 0 will short-circuit out of the percentage based loader as soon as the document is ready
 *
 * the animations will play either when the percentage reaches 100% or when
 * the document is ready plus this delay, whichever comes first
 */
const EXTRA_DELAY = 5000

/**
 * the status of the preloader
 * loading: has not started yet
 * canStillAnimate: we're at 100% loaded, but haven't started the animation yet
 * complete: we've started the out animation
 */
let preloaderState: "loading" | "waitingForAnimate" | "animating" | "allDone" =
	"loading"

interface Animation {
	only?: "whenScrolled" | "whenAtTop"
	callback: VoidFunction
	duration: number
}
let animations: Animation[] = []
const startTime = performance.now()
const timeNeeded = GET_TIME_NEEDED(startTime)
let loaderIsDone = false
export const getLoaderIsDone = () => loaderIsDone

// preserve the scroll position throughout the initial render (page height may change because of pins etc)
if (isBrowser) document.body.style.minHeight = "9999vh"
const initialScroll = isBrowser ? window.scrollY : 0
if (isBrowser) document.body.style.removeProperty("min-height")

const initialScrollLock = createScrollLock()

/**
 * call all callbacks and set done to true
 */
async function onComplete() {
	await allLoaderPromisesSettled()

	// only call onComplete one time
	if (preloaderState !== "loading") return

	preloaderState = "waitingForAnimate"
	loader.dispatchEvent("start", "initial")
	loader.dispatchEvent("progressUpdated", 100)

	// hold at 100 for a beat
	await sleep(250)

	const isAtTop =
		window.scrollY < window.innerHeight ||
		libraryConfig.scrollRestoration === false

	/**
	 * scroll to top if needed
	 */
	if (isAtTop) {
		ScrollSmoother.get()?.scrollTop(0)
		ScrollTrigger.refresh()
		ScrollSmoother.get()?.scrollTop(0)
	} else {
		ScrollSmoother.get()?.scrollTop(initialScroll)
		ScrollTrigger.refresh()
		ScrollSmoother.get()?.scrollTop(initialScroll)
	}

	/**
	 * scroll to anchor if needed
	 */
	const anchor = window.location.hash
	if (anchor) {
		await scrollToAnchor(anchor)
	}

	preloaderState = "animating"

	/**
	 * run all the animations
	 */
	let longestAnimation = 0
	for (const animation of animations) {
		const callAnimation = () => {
			animation.callback()
			longestAnimation = Math.max(longestAnimation, animation.duration)
		}

		if (animation.only) {
			if (animation.only === "whenAtTop" && isAtTop) callAnimation()
			if (animation.only === "whenScrolled" && !isAtTop) callAnimation()
		} else callAnimation()
	}

	await sleep(longestAnimation * 1000 + 10)
	loaderIsDone = true

	// refreshing immediately can cause ScrollSmoother to jump to top
	// doing a safe refresh doesn't math correctly
	// so we do a standard refresh after a short delay
	requestAnimationFrame(() => {
		ScrollTrigger.refresh()
	})
	initialScrollLock.release()
	if (!anchor && !isAtTop) ScrollSmoother.get()?.scrollTop(initialScroll)

	// give refresh time to finish
	await sleep(50)

	loader.dispatchEvent("end", "initial")
	preloaderState = "allDone"
}

/**
 * percentage based loader
 *
 * calculates a new percentage based on the time elapsed since the page started loading
 * and calls all the progress callbacks with the new percentage every frame
 */
const updatePercent = () => {
	pageReady()
		.then(async () => {
			// short circuit if there are no callbacks or animations
			await allLoaderPromisesSettled() // but not before promises are settled
			return animations.length === 0 ? onComplete() : null
		})
		.catch(async () => {
			return onComplete()
		})

	if (preloaderState !== "loading") return

	const currentTime = performance.now()
	const progress = ((currentTime - startTime) / timeNeeded) * 100
	if (progress >= 99) {
		pageReady()
			.then(async () => {
				return onComplete()
			})
			.catch(async () => {
				return onComplete()
			})
	} else {
		loader.dispatchEvent("progressUpdated", progress)
		if (isBrowser) requestAnimationFrame(updatePercent)
	}
}
if (isBrowser) updatePercent()

/**
 * document based loader
 *
 * waits EXTRA_DELAY milliseconds after the document is ready before calling
 * all the animations and all the progress callbacks with 100%
 */
if (isBrowser)
	pageReady()
		.then(async () => {
			await sleep(EXTRA_DELAY)
			return onComplete()
		})
		.catch(async () => {
			await sleep(EXTRA_DELAY)
			return onComplete()
		})

/**
 * register a callback (such as an animation) to be called when the page is loaded
 *
 * @param animation function to call when the page is loaded
 */
export const usePreloader = (animation: Animation) => {
	const latestCallback = useRef(animation.callback)
	latestCallback.current = animation.callback

	useEffect(() => {
		const onCall = () => latestCallback.current()

		if (preloaderState === "animating") onCall()
		else if (preloaderState !== "allDone")
			animations.push({
				duration: animation.duration,
				callback: onCall,
				only: animation.only,
			})

		return () => {
			animations = animations.filter((a) => a.callback !== onCall)
		}
	}, [animation.duration, animation.only])
}
