import { useAsyncEffect } from "ahooks"
import gsap, { ScrollTrigger } from "gsap/all"
import { isBrowser } from "library/deviceDetection"
import { sleep } from "library/functions"
import { ScreenContext } from "library/ScreenContext"
import { createScrollLock } from "library/Scroll"
import { type RefObject, use, useMemo, useState } from "react"
import { flushSync } from "react-dom"
import { instantScrollToAnchor } from "./util"

/**
 * if you're making a preloader, set this to a number of seconds to manually block the main thread for debugging
 *
 * this is incredibly useful because it makes it very easy to tell if your preloader
 * is gpu-accelerated (FAST) or bound to the main thread (SLOW)
 */
const DEBUG_BLOCK_THREAD_FOR_SECONDS = 0

/**
 * force the preloader to remain in a certain state
 * useful for making the preloader
 */
const FORCE_PRELOADER_STATE = undefined as "loading" | "ready" | undefined

// block the main thread for debugging
const useBlockThread = (signal: unknown) => {
	// biome-ignore lint/correctness/useExhaustiveDependencies: debug
	useMemo(() => {
		if (isBrowser && DEBUG_BLOCK_THREAD_FOR_SECONDS > 0) {
			const start = performance.now()
			while (
				performance.now() - start <
				DEBUG_BLOCK_THREAD_FOR_SECONDS * 1000
			) {}
		}
	}, [signal])
}

const globalPromises: Promise<unknown>[] = []
let globalComplete = false
const lock = createScrollLock("lock")
const setGlobalComplete = () => {
	if (!globalComplete) ScrollTrigger.refresh()
	lock.release()
	globalComplete = true
}

/**
 * because multiple preloader hooks will:
 * - run at the same time
 * - need to wait for each other
 * - could run in any order
 *
 * we need to wait for promises recursively
 */
const recursiveAllSettled = async (
	promises: Promise<unknown>[],
	promisesToExclude: Promise<unknown>[] = [],
): Promise<void> => {
	const promisesCopy = [...promises].filter(
		(promise) => !promisesToExclude.includes(promise),
	)
	if (promisesCopy.length === 0) return

	await Promise.allSettled(promisesCopy)
	await recursiveAllSettled(promises, [...promisesToExclude, ...promisesCopy])
}

/**
 * we only ever want to do this once!
 */
let hasProcessedScroll = false
const processScroll = async () => {
	if (!isBrowser) return
	if (hasProcessedScroll) return

	// if there's an anchor in the URL, scroll to it instead of resetting scroll
	const hash = window.location.hash
	if (hash && document.querySelector(hash)) {
		await instantScrollToAnchor(hash)
	} else if (window.scrollY < window.innerHeight) window.scrollTo(0, 0)

	hasProcessedScroll = true
}

export const usePreloader = ({
	minDuration = 0,
	stopAnimations,
	stopNoWaitAnimations,
	slowAnimations,
	scope,
	customAnimationComplete,
}: {
	/**
	 * preloader will wait at least this long in ms
	 * (timed from page load, not affected by react load time)
	 */
	minDuration?: number
	/**
	 * we'll handle stopping any running animations,
	 * just give us a selection of looping animations to stop
	 * and we'll do it when the preloader is ready
	 *
	 * we'll also wait for them to finish their last loop before triggering
	 * the final preloader animation
	 */
	stopAnimations?: string
	/**
	 * same as stopAnimations, but does not wait for the animations to finish
	 */
	stopNoWaitAnimations?: string
	/**
	 * if you just want the animation to slow to a stop, you can specify a selector here
	 * and we'll stop all animations on that selector
	 *
	 * if you don't care about where the animations stop, this is the option for you
	 * if you do want the animation to stop at the beginning, use the stopAnimations option
	 */
	slowAnimations?: string
	scope?: RefObject<HTMLElement | null>
	/**
	 * if you're using a custom animation with javascript,
	 * you'll need to manually signal to the preloader system that it has completed
	 */
	customAnimationComplete?: Promise<unknown>
} = {}) => {
	const { initComplete } = use(ScreenContext)
	const [output, setOutput] = useState<{
		/**
		 * page has loaded and rendered, ready to animate away our preloader
		 */
		ready: boolean
		/**
		 * animation of the preloader has completed
		 */
		completed: boolean
		/**
		 * we loaded the page from the top
		 */
		isAtPageTop: boolean | null
		/**
		 * for debugging, a consistent key
		 * use this to remount if you're debugging with FORCE_PRELOADER_STATE
		 */
		devKey: number
	}>(
		globalComplete
			? {
					// this is our default state after, e.g. a page transition
					ready: true,
					completed: true,
					isAtPageTop: true,
					devKey: Math.random(),
				}
			: {
					ready: false,
					completed: false,
					isAtPageTop: null,
					devKey: Math.random(),
				},
	)

	useBlockThread(output.ready)

	useAsyncEffect(async () => {
		if (!initComplete) return
		if (output.ready) return
		if (FORCE_PRELOADER_STATE === "loading") return

		if ((stopAnimations && !scope) || (slowAnimations && !scope))
			throw new Error("scope is required in order to correctly stop animations")

		processScroll()

		/**
		 * slow down animations
		 */
		if (slowAnimations && scope) {
			const animatedElements = Array.from(
				scope.current?.querySelectorAll(slowAnimations) ?? [],
			)
			for (const element of animatedElements) {
				const animations = element.getAnimations()
				for (const animation of animations) {
					globalPromises.push(
						new Promise((resolve) => {
							gsap.to(animation, {
								playbackRate: 0,
								duration: 1,
								onComplete: resolve,
							})
						}),
					)
				}
			}
		}

		/**
		 * stop animations
		 */
		if (stopAnimations && scope) {
			const animatedElements = Array.from(
				scope.current?.querySelectorAll(stopAnimations) ?? [],
			).map((element) => ({ element, type: "wait" }))
			const noWaitAnimatedElements = Array.from(
				scope.current?.querySelectorAll(stopNoWaitAnimations ?? "") ?? [],
			).map((element) => ({ element, type: "noWait" }))
			for (const { element, type } of [
				...animatedElements,
				...noWaitAnimatedElements,
			]) {
				const animations = element.getAnimations()
				for (const animation of animations) {
					const totalDuration = Number(animation.effect?.getTiming().duration)
					const currentTime = Number(animation.currentTime)
					const completedIterations = Math.floor(currentTime / totalDuration)

					animation.effect?.updateTiming({
						iterations: completedIterations + 1,
					})

					if (type === "wait") globalPromises.push(animation.finished)
				}
			}
		}

		/**
		 * wait for all animations to settle
		 */
		await recursiveAllSettled(globalPromises)

		/**
		 * wait our specified minimum duration
		 */
		const timeSinceStart = performance.now()
		const timeToWait = Math.max(0, minDuration - timeSinceStart)
		await sleep(timeToWait)

		// any animations caused by our state update must be part of the preloader!
		// we can use this to determine the preloader out duration automatically
		// and refresh when it's complete
		const beforeAnimations = document.body.getAnimations({ subtree: true })
		flushSync(() => {
			setOutput((p) => ({
				ready: true,
				completed: false,
				isAtPageTop: window.scrollY < window.innerHeight,
				devKey: p.devKey,
			}))
		})
		const afterAnimations = document.body.getAnimations({ subtree: true })
		const newAnimations = afterAnimations.filter(
			(a) => !beforeAnimations.includes(a),
		)
		for (const animation of newAnimations) {
			globalPromises.push(animation.finished)
		}

		if (customAnimationComplete) globalPromises.push(customAnimationComplete)
		await recursiveAllSettled(globalPromises)
		setGlobalComplete()

		setOutput((p) => ({
			...p,
			completed: true,
		}))
		if (FORCE_PRELOADER_STATE === "ready") {
			setTimeout(
				() =>
					setOutput({
						ready: false,
						completed: false,
						isAtPageTop: null,
						devKey: Math.random(),
					}),
				1000,
			)
		}
	}, [
		initComplete,
		output.ready,
		minDuration,
		scope,
		slowAnimations,
		stopAnimations,
		stopNoWaitAnimations,
		customAnimationComplete,
	])

	if (FORCE_PRELOADER_STATE === "loading")
		return {
			ready: false,
			completed: false,
			isAtPageTop: null,
			devKey: 0,
		}
	return output
}
