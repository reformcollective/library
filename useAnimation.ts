import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import type { DependencyList } from "react"
import { useEffect, useLayoutEffect, useState } from "react"
import { checkGSAP } from "./checkGSAP"
import { isBrowser } from "./deviceDetection"

let globalRefresh: NodeJS.Timeout | undefined

const defaultHook = isBrowser ? useLayoutEffect : useEffect

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
 * @param options.dangerouslyOverrideEffect - override the effect to use - changing this may cause issues with unmounting pins! use with caution!
 * if you're trying to deep compare, a safer solution is to stabilize each of your dependencies with useDeepCompareMemo
 */
const useAnimation = <F, T>(
	createAnimations: F extends VoidFunction ? F : () => T,
	deps: DependencyList,
	options?: {
		scope?: React.RefObject<HTMLElement | null>
		kill?: boolean
		recreateOnResize?: boolean
		extraDeps?: DependencyList
		dangerouslyOverrideEffect?: (
			effect: () => void,
			deps: DependencyList,
		) => void
	},
) => {
	const useEffectToUse = options?.dangerouslyOverrideEffect ?? defaultHook
	const [resizeSignal, setResizeSignal] = useState(
		isBrowser && window.innerWidth,
	)
	const extraDeps = options?.extraDeps ?? []

	type ReturnType =
		// biome-ignore lint/complexity/noBannedTypes: need to use Function to type the hook exactly
		T extends Function
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
				setResizeSignal((previous) => {
					const newValue = window.innerWidth

					// if the value has changed
					// make sure scrolltrigger gets refreshed
					if (newValue !== previous) {
						clearTimeout(globalRefresh)
						globalRefresh = setTimeout(() => {
							ScrollTrigger.refresh()
						}, 1)
					}

					return newValue
				})
			}
			window.addEventListener("resize", onResize)
			return () => window.removeEventListener("resize", onResize)
		}
	}, [options?.recreateOnResize])

	useEffectToUse(() => {
		// create animations using a gsap context so they can be reverted easily
		const ctx = gsap.context(() => {
			const former = window.gsap
			window.gsap = gsap
			const result = createAnimations()
			window.gsap = former
			if (typeof result === "function") {
				return result
			}

			if (typeof result === "object" && result) {
				setReturnValue(result as ReturnType)
			} else {
				setReturnValue(undefined)
			}
		}, options?.scope?.current ?? undefined)
		return () => {
			if (options?.kill) {
				ctx.kill()
			} else ctx.revert()
		}
	}, [options?.kill, options?.scope, resizeSignal, ...deps, ...extraDeps])

	return returnValue
}

export default useAnimation

checkGSAP()
