import { ScrollSmoother } from "gsap/ScrollSmoother"
import libraryConfig from "libraryConfig"

import { isBrowser, sleep } from "../functions"
import { pageReady } from "../pageReady"
import loader, { promisesToAwait, recursiveAllSettled } from "."

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
let isComplete = false
const startTime = performance.now()
const timeNeeded = GET_TIME_NEEDED(startTime)
let loaderIsDone = false
export const getLoaderIsDone = () => loaderIsDone

/**
 * call all callbacks and set done to true
 */
async function onComplete() {
  await recursiveAllSettled(promisesToAwait)

  loader.dispatchEvent("anyStart", "initial")
  loader.dispatchEvent("initialStart")

  progressCallbacks.forEach(cb => cb(100))
  loader.dispatchEvent("progressUpdated", 100)
  isComplete = true
  await sleep(250)

  let longestAnimation = 0
  for (const animation of animations) {
    animation.callback()
    longestAnimation = Math.max(longestAnimation, animation.duration)
  }

  await sleep(longestAnimation * 1000 + 10)
  loaderIsDone = true

  ScrollSmoother.get()?.paused(false)

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
      return progressCallbacks.length === 0 &&
        animations.length === 0 &&
        !isComplete
        ? onComplete()
        : null
    })
    .catch(async () => {
      if (!isComplete) await onComplete()
    })

  if (isComplete) return
  const currentTime = performance.now()
  const progress = ((currentTime - startTime) / timeNeeded) * 100
  if (progress >= 99) {
    pageReady()
      .then(async () => {
        return isComplete ? null : await onComplete()
        return isComplete ? null : onComplete()
      })
      .catch(async () => {
        if (!isComplete) await onComplete()
      })
  } else {
    progressCallbacks.forEach(cb => cb(progress))
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
      return isComplete ? null : await onComplete()
      return isComplete ? null : onComplete()
    })
    .catch(async () => {
      await sleep(EXTRA_DELAY)
      if (!isComplete) await onComplete()
    })

/**
 * register a callback (such as an animation) to be called when the page is loaded
 *
 * @param animation function to call when the page is loaded
 */
export const registerLoaderCallback = (animation: Animation) => {
  if (isComplete) animation.callback()
  else animations.push(animation)
}

/**
 * register a callback (such as a progress bar or percentage) to be called while the page is loading
 * @param callback function to call with the percentage of the page loaded
 */
export const registerProgress = (callback: ProgressCallback) => {
  if (isComplete) callback(100)
  else progressCallbacks.push(callback)
}

/**
 * remove a callback from the list of callbacks
 * @param callback function to remove from the list of callbacks
 */
export const unregisterLoaderCallback = (completionFunction: VoidFunction) => {
  animations = animations.filter(
    animation => animation.callback !== completionFunction
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
