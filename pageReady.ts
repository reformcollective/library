import { useEffect, useMemo, useState, useTransition } from "react"
import { loaderAwaitPromise } from "./Loader/promises"

let waitingForPage = true

const promisesToResolveOnReady: VoidFunction[] = []
const promisesToResolveOnUnmount: VoidFunction[] = []

/**
 * render some UI conditionally, and have the loader delay until that UI is fully rendered
 */
export function useTrackedLoad(artificialDelayMs = 0) {
	const [showInterface, setShowInterface] = useState(false)

	// we can use a transition to track when the UI has rendered
	const [loading, startTransition] = useTransition()
	const allDone = !loading && showInterface

	// create a promise to hold the loader. we'll resolve it when the UI is ready
	const [promise, resolve] = useMemo(() => {
		let resolve: VoidFunction | undefined
		const promise = new Promise<void>((r) => {
			resolve = r
		})
		return [promise, resolve ?? (() => {})]
	}, [])

	// send the promise to the loader
	useEffect(() => {
		loaderAwaitPromise(promise)

		// and don't let the promise hang around after the component is unmounted
		return () => {
			resolve()
		}
	}, [promise, resolve])

	// when the UI is ready, resolve the promise
	useEffect(() => {
		if (allDone) {
			resolve()
		}
	}, [allDone, resolve])

	// kick off the transition after an artificial delay (if specified)
	useEffect(() => {
		setTimeout(() => {
			startTransition(() => {
				setShowInterface(true)
			})
		}, artificialDelayMs)
	}, [artificialDelayMs])

	return {
		/**
		 * a boolean to be used to conditionally render the UI
		 *
		 * this will immediately be set to true (which is how we track the render)
		 */
		shouldDisplay: showInterface,
		/**
		 * true once the UI is fully rendered
		 */
		isLoaded: allDone,
	}
}

/**
 * not sure that these others are actually useful, will maybe deprecate at some point
 */
export function useTrackPageReady() {
	useEffect(() => {
		waitingForPage = false
		for (const fn of promisesToResolveOnReady) {
			fn()
		}
		promisesToResolveOnReady.length = 0

		return () => {
			waitingForPage = true
			for (const fn of promisesToResolveOnUnmount) {
				fn()
			}
			promisesToResolveOnUnmount.length = 0
		}
	})
}

export async function pageReady() {
	return new Promise<void>((resolve) => {
		if (waitingForPage) {
			promisesToResolveOnReady.push(() => resolve())
		} else {
			resolve()
		}
	})
}

export function pageUnmounted() {
	return new Promise<void>((resolve) => {
		promisesToResolveOnUnmount.push(() => resolve())
	})
}
