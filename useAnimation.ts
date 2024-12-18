import { type ContextSafeFunc, useGSAP } from "@gsap/react"
import gsap, { ScrollTrigger } from "gsap/all"
import type { DependencyList } from "react"
import { use, useDeferredValue, useEffect, useState } from "react"
import { createDebouncedEventListener, ScreenContext } from "./ScreenContext"
import { isBrowser } from "./deviceDetection"

let globalRefresh: ReturnType<typeof setTimeout> | undefined

type Creation = (arg: {
	context: gsap.Context
	contextSafe: ContextSafeFunc
}) => unknown

gsap.registerPlugin(useGSAP)
gsap.config({
	nullTargetWarn: false,
})

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
 * @param options.killOnUpdate - whether to kill the animation when the component is unmounted, rather than reverting it
 * @param options.recreateOnResize - whether to re-create the animations when the window is resized
 * @param options.extraDeps - sany extra dependencies that should cause the animations to be re-created (in addition to the ones passed in the deps array)
 */
export const useAnimation = <InputFn extends Creation>(
	createAnimations: InputFn,
	deps?: DependencyList,
	options?: {
		scope?: React.RefObject<Element | null>
		recreateOnResize?: boolean
		killOnUpdate?: boolean
		extraDeps?: DependencyList
	},
) => {
	const [resizeSignal, setResizeSignal] = useState(
		isBrowser && window.innerWidth,
	)

	const standardDeps = deps ?? []
	const extraDeps = options?.extraDeps ?? []

	type OutputType =
		// biome-ignore lint/complexity/noBannedTypes: need to use Function to type the hook exactly
		ReturnType<InputFn> extends Function ? undefined : ReturnType<InputFn>

	const [returnValue, setReturnValue] = useState<OutputType>()

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
			const listener = createDebouncedEventListener("resize", onResize)
			return () => listener.cleanup()
		}
	}, [options?.recreateOnResize])

	const { initComplete } = use(ScreenContext)

	const { context, contextSafe } = useGSAP(
		(context, contextSafe) => {
			if (!contextSafe) return
			if (!initComplete) return

			const result = createAnimations({ context, contextSafe })

			if (typeof result === "function") {
				return result
			}

			setReturnValue(result as OutputType)
		},
		{
			revertOnUpdate: !options?.killOnUpdate,
			scope: options?.scope,
			dependencies: [
				useDeferredValue(initComplete),
				useDeferredValue(resizeSignal),
				...standardDeps,
				...extraDeps,
			],
		},
	)

	return { context, contextSafe, result: returnValue }
}
