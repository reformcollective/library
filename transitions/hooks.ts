import { useEffect, useRef, useState } from "react"
import { createScrollLock } from "../Scroll"
import { loader } from "../link/loader"

export function useTransitionLoader(targetTransitionName?: string) {
	const [isTransitioning, setIsTransitioning] = useState(false)
	const [transitionType, setTransitionType] = useState<string | null>(null)

	useEffect(() => {
		const handleStart = ({ name }: { name?: string }) => {
			if (!targetTransitionName || name === targetTransitionName) {
				setIsTransitioning(true)
				setTransitionType(name ?? null)
			}
		}

		const handleEnd = () => {
			setIsTransitioning(false)
			setTransitionType(null)
		}

		loader.addEventListener("start", handleStart)
		loader.addEventListener("end", handleEnd)

		return () => {
			loader.removeEventListener("start", handleStart)
			loader.removeEventListener("end", handleEnd)
		}
	}, [targetTransitionName])

	return { isTransitioning, transitionType }
}

export function useTransitionScrollLock() {
	const lockRef = useRef<ReturnType<typeof createScrollLock> | null>(null)
	const [isLocked, setIsLocked] = useState(false)

	const lockScroll = () => {
		if (!lockRef.current) {
			lockRef.current = createScrollLock("lock")
			setIsLocked(true)
		}
	}

	const unlockScroll = () => {
		if (lockRef.current) {
			lockRef.current.release()
			lockRef.current = null
			setIsLocked(false)
		}
	}

	useEffect(() => {
		return () => {
			if (lockRef.current) {
				lockRef.current.release()
			}
		}
	}, [])

	return { lockScroll, unlockScroll, isLocked }
}

export function useTransitionTiming() {
	const beforeCallbackRef = useRef<(() => Promise<void> | void) | null>(null)
	const afterCallbackRef = useRef<(() => Promise<void> | void) | null>(null)

	const executeBefore = async (callback: () => Promise<void> | void) => {
		beforeCallbackRef.current = callback
		const result = callback()
		if (result instanceof Promise) {
			await result
		}
	}

	const executeAfter = async (callback: () => Promise<void> | void) => {
		afterCallbackRef.current = callback
		const result = callback()
		if (result instanceof Promise) {
			await result
		}
	}

	return { executeBefore, executeAfter }
}

export function useLenisScroll() {
	const scrollToBottom = async (): Promise<void> => {
		if (!window.lenis) return

		// Scroll to bottom
		window.lenis.scrollTo(Infinity, {
			immediate: true,
			force: true,
		})

		// Wait until we're actually at the bottom
		return new Promise((resolve) => {
			const checkScrollComplete = () => {
				if (!window.lenis) {
					resolve()
					return
				}

				// Check if we've reached the limit (bottom)
				if (window.lenis.scroll >= window.lenis.limit) {
					console.log("[scrollToBottom] Reached limit, scroll complete")
					resolve()
				} else {
					// Not there yet, check next frame
					requestAnimationFrame(checkScrollComplete)
				}
			}

			requestAnimationFrame(checkScrollComplete)
		})
	}

	const waitForElement = async (
		selector: string,
		excludeSelectors: string[] = [],
		maxAttempts = 50,
	): Promise<boolean> => {
		for (let i = 0; i < maxAttempts; i++) {
			const elements = document.querySelectorAll(selector)

			const targetElement = Array.from(elements).find((el) => {
				for (const excludeSelector of excludeSelectors) {
					if (el.closest(excludeSelector)) {
						return false
					}
				}
				return true
			})

			if (targetElement) {
				return true
			}

			await new Promise((resolve) => requestAnimationFrame(resolve))
		}
		return false
	}

	const measureAndScrollToBottom = async (
		waitForSelector?: string,
		excludeSelectors?: string[],
	): Promise<void> => {
		if (!window.lenis) return

		if (waitForSelector) {
			await waitForElement(waitForSelector, excludeSelectors)
		}

		window.lenis.resize()

		await scrollToBottom()
	}

	return { scrollToBottom, measureAndScrollToBottom, waitForElement }
}
