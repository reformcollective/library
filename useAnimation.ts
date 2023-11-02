import gsap from "gsap"
import ScrollSmoother from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import type { DependencyList } from "react"
import { startTransition, useEffect, useState } from "react"

import { checkGSAP } from "./checkGSAP"
import { isBrowser } from "./functions"

let globalRefresh: NodeJS.Timeout | undefined

/**
 * A utility hook that abstracts away the react boilerplate of gsap animation.
 * This hook will take care of cleaning up the animation and clearing inline styles when the component is unmounted or when the dependencies change.
 * ```tsx
 * useAnimation(() => {
 *   gsap.to(wrapperEl, {
 *     duration: 1,
 *     x: 100,
 *   })
 * }, [wrapperEl])
 *  ```
 * @param createAnimations - function that creates the animation. you can return a cleanup function that will be called
 * or an object that will be returned by the hook
 * @param deps - any dependencies that should cause the animations to be re-created
 * @param options - options for the hook
 * @param options.scope - the scope of the animation for GSAP to use
 * @param options.kill - whether to kill the animation when the component is unmounted, rather than reverting it
 * @param options.recreateOnResize - whether to re-create the animations when the window is resized
 * @param options.extraDeps - any extra dependencies that should cause the animations to be re-created (in addition to the ones passed in the deps array)
 * @param options.effect - the effect to use (defaults to useEffect)
 */
const useAnimation = <F, T>(
  createAnimations: F extends VoidFunction ? F : () => T,
  deps: DependencyList,
  options?: {
    scope?: string | Element | null
    kill?: boolean
    recreateOnResize?: boolean
    extraDeps?: DependencyList
    effect?: typeof useEffect
  },
) => {
  const useEffectToUse = options?.effect ?? useEffect
  const [resizeSignal, setResizeSignal] = useState(
    isBrowser() && window.innerWidth,
  )
  const [firstRender, setFirstRender] = useState(true)
  const extraDeps = options?.extraDeps ?? []

  // need Function to get the correct type
  // eslint-disable-next-line @typescript-eslint/ban-types
  type ReturnType = T extends Function
    ? undefined
    : T extends object
    ? T | undefined
    : undefined

  const [returnValue, setReturnValue] = useState<ReturnType>()

  /**
   * when the window is resized, we need to re-create animations
   * if the width of the window changes by more than 10px
   */
  useEffect(() => {
    if (options?.recreateOnResize) {
      const onResize = () => {
        setResizeSignal(previous => {
          const currentScroll = ScrollSmoother.get()?.scrollTop()
          const newValue = window.innerWidth
          // if the value has changed
          if (newValue !== previous) {
            // make sure scroll is maintained and scrolltrigger gets refreshed
            setTimeout(() => {
              if (currentScroll)
                ScrollSmoother.get()?.scrollTo(currentScroll, false)
            }, 1)
            clearTimeout(globalRefresh)
            globalRefresh = setTimeout(() => {
              ScrollTrigger.refresh()
            }, 1000)
          }
          return newValue
        })
      }
      window.addEventListener("resize", onResize)
      return () => window.removeEventListener("resize", onResize)
    }
  }, [options?.recreateOnResize])

  useEffectToUse(() => {
    if (isBrowser()) startTransition(() => setFirstRender(false))
    if (firstRender) return

    // create animations using a gsap context so they can be reverted easily
    const ctx = gsap.context(
      () => {
        const result = createAnimations()
        if (typeof result === "function") {
          return result
        } else if (typeof result === "object" && result) {
          setReturnValue(result as ReturnType)
        } else {
          setReturnValue(undefined)
        }
      },
      options?.scope ?? undefined,
    )
    return () => {
      if (options?.kill) {
        ctx.kill()
      } else ctx.revert()
    }
  }, [
    options?.kill,
    options?.scope,
    firstRender,
    resizeSignal,
    ...deps,
    ...extraDeps,
  ])

  return returnValue
}

export default useAnimation

checkGSAP()
