import { ScrollTrigger } from "gsap/ScrollTrigger"
import type { DependencyList } from "react"
import { useEffect, useState } from "react"
import { isBrowser } from "./deviceDetection"
import { useGSAP } from "@gsap/react"

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
 * @param options.revertOnUpdate - whether to revert the animation when the component is unmounted, rather than killing it
 * @param options.recreateOnResize - whether to re-create the animations when the window is resized
 * @param options.extraDeps - sany extra dependencies that should cause the animations to be re-created (in addition to the ones passed in the deps array)
 */
export const useAnimation = <F, T>(
	createAnimations: F extends VoidFunction ? F : () => T,
	deps: DependencyList,
	options?: {
		scope?: React.RefObject<Element | null>
		recreateOnResize?: boolean
		revertOnUpdate?: boolean
		extraDeps?: DependencyList
	},
) => {
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

	const { context, contextSafe } = useGSAP(
		() => {
			const result = createAnimations()

			if (typeof result === "function") {
				return result
			}

			if (typeof result === "object" && result) {
				setReturnValue(result as ReturnType)
			} else {
				setReturnValue(undefined)
			}
		},
		{
			revertOnUpdate: options?.revertOnUpdate,
			scope: options?.scope,
			dependencies: [resizeSignal, ...deps, ...extraDeps],
		},
	)

	return { context, contextSafe, result: returnValue }
}
