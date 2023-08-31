// we have to spread deps for the hook to work properly
/* eslint-disable react-hooks/exhaustive-deps */
import gsap from "gsap"
import ScrollSmoother from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  DependencyList,
  EffectCallback,
  startTransition,
  useEffect,
  useState,
} from "react"

import { isBrowser } from "./functions"

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
 * @param createAnimations - function that creates the animations
 * @param deps - any dependencies that should cause the animations to be re-created
 * @param options - options for the hook
 * @param options.scope - the scope of the animation for GSAP to use
 * @param options.kill - whether to kill the animation when the component is unmounted, rather than reverting it
 * @param options.recreateOnResize - whether to re-create the animations when the window is resized
 * @param options.extraDeps - any extra dependencies that should cause the animations to be re-created (in addition to the ones passed in the deps array)
 * @param options.effect - the effect to use (defaults to useEffect)
 */
const useAnimation = (
  createAnimations: EffectCallback,
  deps: DependencyList,
  options?: {
    scope?: string | Element | null
    kill?: boolean
    recreateOnResize?: boolean
    extraDeps?: DependencyList
    effect?: typeof useEffect
  },
) => {
  const effectToUse = options?.effect ?? useEffect
  const [resizeSignal, setResizeSignal] = useState(
    isBrowser() && window.innerWidth,
  )
  const [firstRender, setFirstRender] = useState(true)
  const extraDeps = options?.extraDeps ?? []

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
            setTimeout(() => {
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

  effectToUse(() => {
    if (isBrowser()) startTransition(() => setFirstRender(false))
    if (firstRender) return

    // create animations using a gsap context so they can be reverted easily
    const ctx = gsap.context(createAnimations, options?.scope ?? undefined)
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
}

export default useAnimation
