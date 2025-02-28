import gsap from "gsap"
import {
	use,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type DependencyList,
} from "react"
import { ScreenContext } from "./ScreenContext"

const useIsomorphicLayoutEffect =
	typeof document !== "undefined" ? useLayoutEffect : useEffect

// biome-ignore lint/complexity/noBannedTypes: gsap types go brrrrr
type ContextSafeFunc = <T extends Function>(func: T) => T
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
	deps: DependencyList,
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
		 * kill them, or revert them. when the component unmounts,
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

	// inputs
	const {
		extraDeps = [],
		recreateOnResize = false,
		scope = { current: null },
		updateBehavior = "revert",
	} = options ?? {}
	const { initComplete, innerWidth } = use(ScreenContext)
	const dependencies = [...deps, ...extraDeps]

	// cleanup FNs
	// gsap context will call cleanup functions when reverted, but not when killed
	// so we'll track them ourselves to ensure they're run properly
	const cleanups = useRef<(() => unknown)[]>([])
	const runCleanups = () => {
		for (const cleanup of cleanups.current) {
			cleanup()
		}
		cleanups.current = []
	}

	// output state
	const [returnValue, setReturnValue] = useState<OutputType>()
	const [context, setContext] = useState<gsap.Context>(gsap.context(() => {}))
	const contextSafe = useMemo(
		() =>
			((func) =>
				context.add(null as unknown as string, func)) as ContextSafeFunc,
		[context],
	)

	// final revert
	const latestContext = useRef(context)
	latestContext.current = context
	useIsomorphicLayoutEffect(() => {
		return () => {
			if (!latestContext.current.isReverted) latestContext.current.revert()
			if (updateBehavior === "none") runCleanups()
		}
	}, [updateBehavior])

	// actual animation creation
	useIsomorphicLayoutEffect(() => {
		const newContext = gsap.context((self) => {
			if (!initComplete) return

			const result = createAnimations({
				context: self,
				contextSafe: ((func) =>
					context.add(null as unknown as string, func)) as ContextSafeFunc,
			})

			if (typeof result === "function") {
				cleanups.current.push(result as () => unknown)
				return result
			}

			setReturnValue(result as OutputType)
		}, scope.current ?? undefined)

		setContext(newContext)

		return () => {
			if (!newContext.isReverted)
				switch (updateBehavior) {
					case "kill":
						newContext.kill()
						runCleanups()
						break
					case "revert":
						newContext.revert()
						break
					case "none":
						break
					default:
						updateBehavior satisfies never
				}
		}
	}, [
		updateBehavior,
		initComplete,
		recreateOnResize ? innerWidth : null,
		updateBehavior,
		...dependencies,
	])

	return {
		contextSafe,
		result: returnValue,
		context: context,
	}
}
