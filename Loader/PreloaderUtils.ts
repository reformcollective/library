import { ScrollSmoother, ScrollTrigger } from "gsap/all"
import libraryConfig from "libraryConfig"

import { createScrollLock } from "library/Scroll"
import { isBrowser } from "library/deviceDetection"
import { useEffect, useRef } from "react"
import { loader } from "."
import { sleep } from "../functions"
import { allLoaderPromisesSettled } from "./promises"
import { scrollToAnchor } from "./scrollToAnchor"

let resolve: () => void
const pageReady = new Promise<void>((res, rej) => {
	resolve = res
})
export const useTriggerPreloader = async () => {
	useEffect(() => {
		resolve()
	}, [])
}

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

interface PreloaderAnimation {
	/**
	 * for some animations, it's critical the animation plays (even if the page was loaded a long time ago)
	 * for example, a preloader that covers the entire screen is critical, since if the animation doesn't play
	 * the screen will be stuck on the preloader
	 */
	critical?: boolean
	/**
	 * if you'd like different animations when the page is scrolled down (i.e. reloaded when scrolled) you can specify this here
	 */
	only?: "whenScrolled" | "whenAtTop"
	/**
	 * how long the animation takes to finish (when scrolling can 'unlock')
	 */
	duration: number
	/**
	 * a function to run the animation
	 */
	callback: VoidFunction
}

let animations: PreloaderAnimation[] = []
const startTime = performance.now()
const timeNeeded = GET_TIME_NEEDED(startTime)
let loaderIsDone = false
export const getLoaderIsDone = () => loaderIsDone

const initialScrollLock = createScrollLock()

/**
 * call all callbacks and set done to true
 */
async function onComplete(skipScrollTop?: boolean) {
	await allLoaderPromisesSettled()

	// only call onComplete one time
	if (preloaderState !== "loading") return

	preloaderState = "waitingForAnimate"
	loader.dispatchEvent("start", "initial")
	loader.dispatchEvent("progressUpdated", 100)

	// hold at 100 for a beat
	await sleep(250)

	const goToTop =
		window.scrollY < window.innerHeight ||
		libraryConfig.scrollRestoration === false

	/**
	 * scroll to top if needed
	 */
	if (!skipScrollTop) {
		if (goToTop) {
			ScrollSmoother.get()?.scrollTop(0)
			ScrollTrigger.refresh()
			ScrollSmoother.get()?.scrollTop(0)
		}
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
			if (animation.only === "whenAtTop" && goToTop) callAnimation()
			if (animation.only === "whenScrolled" && !goToTop) callAnimation()
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
	pageReady
		.then(async () => {
			// short circuit if there are no callbacks or animations
			await allLoaderPromisesSettled() // but not before promises are settled
			return animations.length === 0 ||
				animations.every((a) => a.duration === 0)
				? onComplete(true)
				: null
		})
		.catch(async () => {
			return onComplete()
		})

	if (preloaderState !== "loading") return

	const currentTime = performance.now()
	const progress = ((currentTime - startTime) / timeNeeded) * 100
	if (progress >= 99) {
		pageReady
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
	pageReady
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
export const usePreloader = (animation: PreloaderAnimation) => {
	const latestCallback = useRef(animation.callback)
	latestCallback.current = animation.callback

	useEffect(() => {
		const onCall = () => latestCallback.current()

		if (preloaderState === "animating") onCall()
		else if (preloaderState === "allDone" && animation.critical) onCall()
		else if (preloaderState !== "allDone")
			animations.push({
				duration: animation.duration,
				callback: onCall,
				only: animation.only,
			})

		return () => {
			animations = animations.filter((a) => a.callback !== onCall)
		}
	}, [animation.duration, animation.only, animation.critical])
}
