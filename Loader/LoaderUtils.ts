import loader, { promisesToAwait, recursiveAllSettled } from "."
import { isBrowser, sleep } from "../functions"
import { pageReady } from "../pageReady"

/**
 * we get a percentage by simply guessing how long the page will take to load based on
 * how long it's taken to load so far
 * the amount of time needed to load the page is pretty arbitrary, so you can adjust this function to fit
 */
const GET_TIME_NEEDED = (rawMs: number) => rawMs * 4 + 1000

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

  loader.dispatchEvent("anyStart", new CustomEvent("anyStart"))
  loader.dispatchEvent("initialStart", new CustomEvent("initialStart"))

  progressCallbacks.forEach(cb => cb(100))
  loader.dispatchEvent(
    "progressUpdated",
    new CustomEvent("progressUpdated", { detail: 100 })
  )
  isComplete = true
  await sleep(250)

  const longestAnimation = animations.reduce((longest, animation) => {
    animation.callback()
    return Math.max(longest, animation.duration)
  }, 0)

  await sleep(longestAnimation * 1000 + 10)
  loaderIsDone = true

  loader.dispatchEvent("anyEnd", new CustomEvent("anyEnd"))
  loader.dispatchEvent("initialEnd", new CustomEvent("initialEnd"))
}

/**
 * percentage based loader
 *
 * calculates a new percentage based on the time elapsed since the page started loading
 * and calls all the progress callbacks with the new percentage every frame
 */
const updatePercent = () => {
  if (isComplete) return
  const currentTime = performance.now()
  const progress = ((currentTime - startTime) / timeNeeded) * 100
  if (progress >= 99) {
    pageReady()
      .then(async () => {
        if (!isComplete) await onComplete()
      })
      .catch(async () => {
        if (!isComplete) await onComplete()
      })
  } else {
    progressCallbacks.forEach(cb => cb(progress))
    loader.dispatchEvent(
      "progressUpdated",
      new CustomEvent("progressUpdated", { detail: progress })
    )
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
      if (!isComplete) await onComplete()
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
