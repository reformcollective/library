import { useAsyncEffect } from "ahooks"
import gsap, { ScrollTrigger } from "gsap/all"
import { ScreenContext } from "library/ScreenContext"
import { createScrollLock } from "library/Scroll"
import { isBrowser } from "library/deviceDetection"
import { sleep } from "library/functions"
import { type RefObject, use, useMemo, useState } from "react"
import { flushSync } from "react-dom"

/**
 * if you're making a preloader, set this to a number of seconds to manually block the main thread for debugging
 *
 * this is incredibly useful because it makes it very easy to tell if your preloader
 * is gpu-accelerated (FAST) or bound to the main thread (SLOW)
 */
const DEBUG_BLOCK_THREAD_FOR_SECONDS = 0

// block the main thread for debugging
const useBlockThread = () => {
	useMemo(() => {
		if (isBrowser && DEBUG_BLOCK_THREAD_FOR_SECONDS > 0) {
			const start = performance.now()
			while (
				performance.now() - start <
				DEBUG_BLOCK_THREAD_FOR_SECONDS * 1000
			) {}
		}
	}, [])
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
const processScroll = () => {
	if (!isBrowser) return
	if (hasProcessedScroll) return

	if (window.scrollY < window.innerHeight) window.scrollTo(0, 0)

	hasProcessedScroll = true
}

export const usePreloader = ({
	minDuration = 0,
	stopAnimations,
	slowAnimations,
	scope,
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
	 * if you just want the animation to slow to a stop, you can specify a selector here
	 * and we'll stop all animations on that selector
	 *
	 * if you don't care about where the animations stop, this is the option for you
	 * if you do want the animation to stop at the beginning, use the stopAnimations option
	 */
	slowAnimations?: string
	scope?: RefObject<HTMLElement | null>
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
	}>(
		globalComplete
			? {
					// this is our default state after, e.g. a page transition
					ready: true,
					completed: true,
					isAtPageTop: true,
				}
			: {
					ready: false,
					completed: false,
					isAtPageTop: null,
				},
	)

	useBlockThread()

	useAsyncEffect(async () => {
		if (!initComplete) return
		if (output.ready) return

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
			)
			for (const element of animatedElements) {
				const animations = element.getAnimations()
				for (const animation of animations) {
					const totalDuration = Number(animation.effect?.getTiming().duration)
					const currentTime = Number(animation.currentTime)
					const completedIterations = Math.floor(currentTime / totalDuration)

					animation.effect?.updateTiming({
						iterations: completedIterations + 1,
					})

					globalPromises.push(animation.finished)
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
			setOutput({
				ready: true,
				completed: false,
				isAtPageTop: window.scrollY < window.innerHeight,
			})
		})
		const afterAnimations = document.body.getAnimations({ subtree: true })
		const newAnimations = afterAnimations.filter(
			(a) => !beforeAnimations.includes(a),
		)
		for (const animation of newAnimations) {
			globalPromises.push(animation.finished)
		}

		await recursiveAllSettled(globalPromises)
		setGlobalComplete()

		setOutput((p) => ({
			...p,
			completed: true,
		}))
	}, [
		initComplete,
		output.ready,
		minDuration,
		scope,
		slowAnimations,
		stopAnimations,
	])

	return output
}
