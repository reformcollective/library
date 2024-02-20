import { useEffect } from "react"

let waitingForPage = true

const promisesToResolveOnReady: VoidFunction[] = []
const promisesToResolveOnUnmount: VoidFunction[] = []

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
