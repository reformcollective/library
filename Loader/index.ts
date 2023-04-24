import { sleep } from "library/functions"
import { TransitionNames } from "libraryConfig"

/**
 * transitionNames are configured in src/libraryConfig.ts
 */
export type Transitions = TransitionNames
export type InternalTransitions = "initial" | "any" | "none"

interface EventMaps {
  anyStart: CustomEvent<Transitions | InternalTransitions>
  anyEnd: CustomEvent<Transitions | InternalTransitions>
  initialStart: CustomEvent<never>
  initialEnd: CustomEvent<never>
  progressUpdated: CustomEvent<number>
  transitionStart: CustomEvent<Transitions | InternalTransitions>
  transitionEnd: CustomEvent<Transitions | InternalTransitions>
  scrollToTop: CustomEvent<never>
}
type EventName = keyof EventMaps

// a strongly typed event emitter

class Loader {
  private eventTarget: EventTarget

  constructor() {
    this.eventTarget = new EventTarget()
  }

  public addEventListener<T extends EventName>(
    eventName: T,
    listener: (event: EventMaps[T]) => void
  ) {
    this.eventTarget.addEventListener(eventName, listener as EventListener)
  }

  public removeEventListener<T extends EventName>(
    eventName: T,
    listener: (event: EventMaps[T]) => void
  ) {
    this.eventTarget.removeEventListener(eventName, listener as EventListener)
  }

  public dispatchEvent<T extends EventName>(eventType: T, event: EventMaps[T]) {
    this.eventTarget.dispatchEvent(event)
  }
}

/**
 * EVENTS
 * anyStart
 * - fires when any animation starts, including initial page load
 *
 * anyEnd
 * - fires when any animation ends, including initial page load
 *
 * initialStart
 * - fires when initial page load transition starts
 *
 * initialEnd
 * - fires when initial page load transition ends
 *
 * transitionStart
 * - fires when any page transition starts
 * - event.detail is the transition name
 *
 * transitionEnd
 * - fires when any page transition ends
 * - event.detail is the transition name
 *
 * progressUpdated
 * - fires when the progress bar is updated
 * - event.detail is the new progress value
 *
 * scrollToTop
 * - fires when the page is scrolled to the top via a link click
 */
const loader = new Loader()

export default loader

export const promisesToAwait: Promise<unknown>[] = []

/**
 * wait for a promise to settle before transitioning to the next page
 * useful for waiting on a file, such as a video, to load
 * @param promise promise to await
 */
export function transitionAwaitPromise(promise: Promise<unknown>) {
  promisesToAwait.push(Promise.race([promise, sleep(10_000)]))
}

export const recursiveAllSettled = async (
  promises: Promise<unknown>[],
  promisesToExclude: Promise<unknown>[] = []
): Promise<void> => {
  const promisesCopy = [...promises].filter(
    promise => !promisesToExclude.includes(promise)
  )
  if (promisesCopy.length === 0) return

  await Promise.allSettled(promisesCopy)
  await recursiveAllSettled(promises, [...promisesToExclude, ...promisesCopy])
  promisesToAwait.length = 0
}
