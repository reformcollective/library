// we have to spread deps for the hook to work properly
/* eslint-disable react-hooks/exhaustive-deps */
import { DependencyList, EffectCallback, useEffect, useState } from "react"

import gsap from "gsap"
import ScrollSmoother from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"

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
 */
const useAnimation = (
  createAnimations: EffectCallback,
  deps: DependencyList,
  options?: {
    scope?: string | Element | null
    kill?: boolean
    recreateOnResize?: boolean
  }
) => {
  const [resizeSignal, setResizeSignal] = useState(
    isBrowser() && Math.round(window.innerWidth / 10)
  )

  /**
   * when the window is resized, we need to re-create animations
   * if the width of the window changes by more than 10px
   */
  useEffect(() => {
    if (options?.recreateOnResize) {
      const onResize = () => {
        setResizeSignal(previous => {
          const currentScroll = ScrollSmoother.get()?.scrollTop()
          const newValue = Math.round(window.innerWidth / 10)
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

  useEffect(() => {
    // create animations using a gsap context so they can be reverted easily
    const ctx = gsap.context(createAnimations, options?.scope ?? undefined)
    return () => {
      if (options?.kill) {
        ctx.kill()
      } else ctx.revert()
    }
  }, [options?.kill, options?.scope, resizeSignal, ...deps])
}

export default useAnimation
