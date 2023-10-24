import { navigate as gatsbyNavigate } from "gatsby"
import gsap from "gsap"
import ScrollSmoother from "gsap/ScrollSmoother"
import { pathnameMatches, sleep } from "library/functions"
import { pageReady, pageUnmounted } from "library/pageReady"
import { useEffect } from "react"

import type { InternalTransitions, Transitions } from "."
import loader, { promisesToAwait, recursiveAllSettled } from "."
import { getLoaderIsDone } from "./LoaderUtils"

const pushPage = (to: string) => {
  // the type of the gatsby navigate function is incorrect
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  gatsbyNavigate(to)
}

/**
 * A function that runs an animation and returns the duration of that animation in seconds
 */
interface Animation {
  callback: VoidFunction
  duration: number
}

/**
 * Object tracking all the registered transitions
 */
const allTransitions: Record<
  string,
  {
    inAnimation: Animation[]
    outAnimation: Animation[]
  }
> = {}

/**
 * register a transition that can be run with a UniversalLink or by using loadPage.
 * note that the animation functions must return the duration of the animation in seconds
 *
 * @param name the name of the transition
 * @param inAnimation the animation to run before navigating
 * @param outAnimation the animation to run after navigating
 */
export const registerTransition = (
  name: Exclude<Transitions, InternalTransitions | undefined>,
  details: {
    in: VoidFunction
    out: VoidFunction
    inDuration: number
    outDuration: number
  },
) => {
  const {
    in: inAnimation,
    out: outAnimation,
    inDuration,
    outDuration,
  } = details
  const previous = allTransitions[name] ?? { inAnimation: [], outAnimation: [] }
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
}

/**
 * unregister a previously registered transition, such as when a transition component unmounts
 *
 * if inAnimation and outAnimation are not provided, all registered transitions with the given name will be unregistered
 *
 * @param name the name of the transition to unmount
 * @param inAnimation if provided, only unregister this specific animation
 * @param outAnimation if provided, only unregister this specific animation
 */
export const unregisterTransition = (
  name: string,
  callbacksToRemove?: VoidFunction[],
) => {
  if (callbacksToRemove) {
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
  } else {
    allTransitions[name] = { inAnimation: [], outAnimation: [] }
  }
}

let pendingTransition: {
  name: string
  transition?: Transitions | InternalTransitions
  anchor?: string
} | null = null
let currentAnimation: string | null = null

/**
 * load a page, making use of the specified transition
 * @param to page to load
 * @param transition the transition to use
 */
export const loadPage = async (
  to: string,
  transition?: Transitions | InternalTransitions,
  anchor?: string,
) => {
  // if a transition is already in progress, wait for it to finish before loading the next page
  if (currentAnimation !== null) {
    if (!pathnameMatches(to, currentAnimation))
      pendingTransition = { name: to, transition, anchor }
    return
  }

  // if we're already on the page we're trying to load, just scroll to the top
  if (pathnameMatches(to, window.location.pathname)) {
    ScrollSmoother.get()?.paused(false)

    // scroll to anchor if applicable, otherwise scroll to top
    if (anchor) {
      ScrollSmoother.get()?.scrollTo(anchor, true, "top 100px")
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
      loader.dispatchEvent("scrollToTop")
    }

    return
  }

  // if no transition is specified, instantly transition pages
  if (!transition || !allTransitions[transition]) {
    navigate(to)
    await pageUnmounted()
    await pageReady()

    // if the desired behavior is to scroll to a certain point on the page after the transition, do so.
    // This is not currently supported for transitions without animations
    ScrollSmoother.get()?.paused(false)
    if (anchor) {
      throw new Error("anchors without transitions not supported!")
    } else {
      // an anchor is not specified, scroll to the top of the page
      ScrollSmoother.get()?.scrollTo(0, false)
      window.scrollTo(0, 1)
    }

    // fire events with detail "none"
    loader.dispatchEvent("transitionEnd", "none")
    loader.dispatchEvent("anyEnd", "none")

    return
  }

  // start this animation
  currentAnimation = to

  // wait for the initial loader to finish animation before starting the transition
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
  loader.dispatchEvent("anyStart", transition)
  loader.dispatchEvent("transitionStart", transition)
  ScrollSmoother.get()?.paused(true)

  // wait for entrance animation to finish
  await sleep(entranceDuration * 1000)

  // actually navigate to the page
  navigate(to, () => {
    animationContext.revert()
  })
  await pageReady()

  // wait for any promises to settle
  promisesToAwait.push(sleep(0))
  await recursiveAllSettled(promisesToAwait)

  // if the desired behavior is to scroll to a certain point on the page
  // after the transition, do so. This is done after the exit animation
  // to prevent the page from jumping around, it also recalls the scrollTo
  // function multiple times to ensure the scroll is maintained
  if (anchor) {
    ScrollSmoother.get()?.scrollTo(anchor, false, "top 100px")

    // scroll to the anchor multiple times to ensure we're at the right place
    let goodAttemptCount = 0
    let scrollPosition = 0
    while (goodAttemptCount < 3) {
      ScrollSmoother.get()?.scrollTo(anchor, false, "top 100px")

      // if we moved less than 10 pixels, count it as a good attempt
      const newPosition = ScrollSmoother.get()?.scrollTop() ?? 0
      if (Math.abs(newPosition - scrollPosition) < 10) goodAttemptCount += 1
      scrollPosition = newPosition

      await sleep(50)
    }
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
  loader.dispatchEvent("anyEnd", transition)
  loader.dispatchEvent("transitionEnd", transition)
  ScrollSmoother.get()?.paused(false)

  // cleanup and reset
  animationContext.revert()
  currentAnimation = null

  // start the next transition if applicable
  if (pendingTransition?.transition) {
    loadPage(
      pendingTransition.name,
      pendingTransition.transition,
      pendingTransition.anchor,
    ).catch((error: string) => {
      throw new Error(error)
    })
    pendingTransition = null
  }
  ScrollTrigger.refresh()
}

/**
 * navigate to an external or internal link without a transition
 * @param to the link to navigate to
 * @param cleanupFunction a function to reset the page to its original state (if back button is pressed after external link)
 */
export const navigate = (to: string, cleanupFunction?: VoidFunction) => {
  const isExternal = to.slice(0, 8).includes("//")

  if (isExternal) {
    window.open(to)

    // if the user presses the back button after navigation, we'll need to cleanup any animations
    setTimeout(() => {
      cleanupFunction?.()
    }, 1000)
  } else {
    pushPage(to)
  }
}

/**
 * tracks when a page is done loading, for use in layout
 * also handles bugs with back/forward buttons
 */
export function useBackButton() {
  useEffect(() => {
    const handleBackButton = () => {
      ;(async () => {
        loader.dispatchEvent("initialStart")
        loader.dispatchEvent("anyStart", "none")
        await pageUnmounted()
        await pageReady()
        window.scrollTo(0, 1)
        await sleep(500)
        loader.dispatchEvent("transitionEnd", "none")
        loader.dispatchEvent("anyEnd", "none")
      })().catch(console.error)
    }
    window.addEventListener("popstate", handleBackButton)
    return () => window.removeEventListener("popstate", handleBackButton)
  })
}
