import { type ContextSafeFunc, useGSAP } from "@gsap/react"
import gsap from "gsap/all"
import type { DependencyList } from "react"
import { use, useDeferredValue, useRef, useState } from "react"
import { ScreenContext } from "./ScreenContext"

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
 */
export const useAnimation = <InputFn extends Creation>(
	/**
	 * function that creates the animation. you can return also cleanup function that will be called on revert/kill
	 */
	createAnimations: InputFn,
	/**
	 * any dependencies that should cause the animations to be re-created
	 */
	deps?: DependencyList,
	/**
	 * options for the hook
	 */
	options?: {
		/**
		 * the scope of the animation for GSAP to use
		 */
		scope?: React.RefObject<Element | null>
		/**
		 * whether to re-create the animations when the window is resized
		 */
		recreateOnResize?: boolean
		/**
		 * when deps change, how should we handle currently running animations?
		 * kill them, revert them, or do nothing. when the component unmounts,
		 * we'll always fully revert regardless of this setting
		 */
		updateBehavior?: "kill" | "revert" | "none"
		/**
		 * any extra dependencies that should cause the animations to be re-created
		 * (in addition to the ones passed in the deps array)
		 *
		 * useful because you can retain dependency linting while also including
		 * extra dependencies
		 */
		extraDeps?: DependencyList
	},
) => {
	const standardDeps = deps ?? []
	const extraDeps = options?.extraDeps ?? []

	type OutputType =
		// biome-ignore lint/complexity/noBannedTypes: need to use Function to type the hook exactly
		ReturnType<InputFn> extends Function ? undefined : ReturnType<InputFn>

	const [returnValue, setReturnValue] = useState<OutputType>()

	const { initComplete, innerWidth } = use(ScreenContext)
	const resizeSignal = Math.round(innerWidth)
	const previousContext = useRef(gsap.context(() => {}))

	const { context, contextSafe } = useGSAP(
		(context, contextSafe) => {
			if (!contextSafe) return
			if (!initComplete) return

			if (options?.updateBehavior === "kill") {
				previousContext.current.kill()
				previousContext.current = gsap.context(() => {})
			}

			previousContext.current.add(() => {
				const result = createAnimations({ context, contextSafe })

				if (typeof result === "function") {
					return result
				}

				setReturnValue(result as OutputType)
			})
		},
		{
			revertOnUpdate:
				options?.updateBehavior === "revert" ||
				options?.updateBehavior === undefined,
			scope: options?.scope,
			dependencies: [
				options?.updateBehavior,
				useDeferredValue(initComplete),
				useDeferredValue(resizeSignal),
				...standardDeps,
				...extraDeps,
			],
		},
	)

	return { context, contextSafe, result: returnValue }
}
