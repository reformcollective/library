import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import libraryConfig from "libraryConfig"

import loader, { promisesToAwait, recursiveAllSettled } from "."
import { isBrowser, sleep } from "../functions"
import { pageReady } from "../pageReady"

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

interface Animation {
	callback: VoidFunction
	duration: number
}

type ProgressCallback = (percent: number) => void
const progressCallbacks: ProgressCallback[] = []
let animations: Animation[] = []
let completionStatus: "loading" | "canStillAnimate" | "complete" = "loading"
const startTime = performance.now()
const timeNeeded = GET_TIME_NEEDED(startTime)
let loaderIsDone = false
export const getLoaderIsDone = () => loaderIsDone

/**
 * call all callbacks and set done to true
 */
async function onComplete() {
	await recursiveAllSettled(promisesToAwait)

	if (completionStatus !== "loading") return
	completionStatus = "canStillAnimate"

	loader.dispatchEvent("anyStart", "initial")
	loader.dispatchEvent("initialStart")
	for (const cb of progressCallbacks) {
		cb(100)
	}
	loader.dispatchEvent("progressUpdated", 100)

	await sleep(250)

	completionStatus = "complete"

	let longestAnimation = 0
	for (const animation of animations) {
		animation.callback()
		longestAnimation = Math.max(longestAnimation, animation.duration)
	}

	await sleep(longestAnimation * 1000 + 10)
	loaderIsDone = true

	// refreshing immediately can cause ScrollSmoother to jump to top
	// doing a safe refresh doesn't math correctly
	// so we do a standard refresh after a short delay
	requestAnimationFrame(() => {
		ScrollTrigger.refresh()
	})
	ScrollSmoother.get()?.paused(false)

	// give refresh time to finish
	await sleep(50)

	loader.dispatchEvent("anyEnd", "initial")
	loader.dispatchEvent("initialEnd")
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
			await recursiveAllSettled(promisesToAwait) // but not before promises are settled
			return progressCallbacks.length === 0 && animations.length === 0
				? onComplete()
				: null
		})
		.catch(async () => {
			return onComplete()
		})

	if (completionStatus !== "loading") return

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
		for (const cb of progressCallbacks) {
			cb(progress)
		}
		loader.dispatchEvent("progressUpdated", progress)
		if (isBrowser()) requestAnimationFrame(updatePercent)
	}
}
if (isBrowser()) updatePercent()

/**
 * document based loader
 *
 * waits EXTRA_DELAY milliseconds after the document is ready before calling
 * all the animations and all the progress callbacks with 100%
 */
if (isBrowser())
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
export const registerLoaderCallback = (animation: Animation) => {
	if (completionStatus === "complete") animation.callback()
	else animations.push(animation)
}

/**
 * register a callback (such as a progress bar or percentage) to be called while the page is loading
 * @param callback function to call with the percentage of the page loaded
 */
export const registerProgress = (callback: ProgressCallback) => {
	if (completionStatus === "complete") callback(100)
	else progressCallbacks.push(callback)
}

/**
 * remove a callback from the list of callbacks
 * @param callback function to remove from the list of callbacks
 */
export const unregisterLoaderCallback = (completionFunction: VoidFunction) => {
	animations = animations.filter(
		(animation) => animation.callback !== completionFunction,
	)
}

/**
 * remove a progress callback from the list
 * @param callback function to remove from the list of callbacks
 */
export const unregisterProgress = (callback: ProgressCallback) => {
	const index = progressCallbacks.indexOf(callback)
	if (index > -1) progressCallbacks.splice(index, 1)
}
