import gsap from "gsap/all"
import type { DependencyList } from "react"
import {
	use,
	useDeferredValue,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react"
import { ScreenContext } from "./ScreenContext"
import { isBrowser } from "./deviceDetection"

const useIsoEffect = isBrowser ? useLayoutEffect : useEffect

type ContextSafeFunc = <T extends (...args: unknown[]) => unknown>(func: T) => T
type Creation = (arg: {
	context: gsap.Context
	contextSafe: ContextSafeFunc
}) => unknown

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
	type OutputType =
		// biome-ignore lint/complexity/noBannedTypes: need to use Function to type the hook exactly
		ReturnType<InputFn> extends Function ? undefined : ReturnType<InputFn>

	const standardDeps = deps ?? []
	const extraDeps = options?.extraDeps ?? []
	const { initComplete, innerWidth } = use(ScreenContext)
	const resizeSignal = Math.round(innerWidth)

	const dependencies = [
		options?.updateBehavior,
		options?.recreateOnResize ? resizeSignal : undefined,
		useDeferredValue(initComplete),
		useDeferredValue(resizeSignal),
		...standardDeps,
		...extraDeps,
	]

	const [returnValue, setReturnValue] = useState<OutputType>()
	const context = useRef(gsap.context(() => {}))
	const cleanups = useRef<(() => unknown)[]>([])
	const runCleanup = (revert: boolean) => {
		context.current.kill(revert)
		for (const cleanup of cleanups.current) {
			cleanup()
		}
		cleanups.current = []
	}

	const contextSafe: ContextSafeFunc = useMemo(
		() => (func) => context.current.add(null, func),
		[context],
	)

	useIsoEffect(() => {}, [])

	return {
		context,
		contextSafe,
		result: returnValue,
	}
}
