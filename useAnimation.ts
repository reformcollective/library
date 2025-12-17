import gsap from "gsap"
import {
	type DependencyList,
	use,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react"
import { isBrowser } from "./deviceDetection"
import { ScreenContext } from "./ScreenContext"
import { useHMR } from "./useHMR"

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
		 * when component unmounts, how should we handle currently running animations?
		 * kill them, or revert them.
		 */
		unmountBehavior?: "kill" | "revert" | "none"
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

	// devtools
	const [hmrHash, setHmrHash] = useState<string | null>(null)
	const scheduleRevert = useRef(false)

	// inputs & options
	const {
		extraDeps = [],
		recreateOnResize = false,
		scope = { current: null },
		updateBehavior = "revert",
		unmountBehavior = "kill",
	} = options ?? {}
	const { innerWidth, shouldHydrateUtilities } = use(ScreenContext)

	const dependencies = [...deps, ...extraDeps]

	// manually tracked cleanup functions
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

	// final revert
	const latestContext = useRef(context)
	useLayoutEffect(() => {
		latestContext.current = context
	}, [context])
	useIsomorphicLayoutEffect(() => {
		return () => {
			if (!latestContext.current.isReverted) {
				if (unmountBehavior === "revert") {
					latestContext.current.revert()
				} else if (unmountBehavior === "kill") {
					latestContext.current.kill()
				}
			}

			// prevent memory leaks from the first context (which is useless but technically needs cleanup still)
			if (!context.isReverted) {
				if (unmountBehavior === "revert") {
					context.revert()
				} else if (unmountBehavior === "kill") {
					context.kill()
				}
			}

			// run cleanups for "kill" or "none"
			// prevent memory leaks from i.e. event listeners (revert will clean up the most recent run, but not the ones before)
			// TODO: this might not be needed for 'kill' but I don't have time to investigate
			if (unmountBehavior !== "revert") runCleanups()
		}
	}, [unmountBehavior])

	// actual animation creation
	useIsomorphicLayoutEffect(() => {
		if (!shouldHydrateUtilities) return

		const newContext = gsap.context((self) => {
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
			if (!newContext.isReverted) {
				if (scheduleRevert.current) {
					newContext.revert()
				} else
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
		}
	}, [
		updateBehavior,
		shouldHydrateUtilities,
		recreateOnResize ? innerWidth : null,
		...dependencies,
		hmrHash,
	])

	useHMR((hash) => {
		scheduleRevert.current = true
		setHmrHash(hash)
	})
	useEffect(() => {
		scheduleRevert.current = false
	})

	return {
		result: returnValue,
		context: context,
	}
}

declare global {
	interface Window {
		gsapVersions?: string[]
	}
}

const versions = isBrowser ? (window.gsapVersions ?? []) : []
if (versions.length > 1)
	throw new Error(
		"Multiple versions of gsap detected! This will cause MAJOR issues!",
	)
