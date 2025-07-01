import { useEventListener } from "ahooks"
import { useEffect, useRef, useState } from "react"

/**
 * useThrottle, but throttling is also throttled.
 * so! anytime the value changes, it will ALWAYS wait the full duration before updating again, even if that change was delayed by a throttle.
 */
export function useBetterThrottle<T>(value: T, msWait: number): T {
	const [throttledValue, setThrottledValue] = useState(value)

	const throttledUntil = useRef(Date.now() + msWait)
	const isWaiting = useRef(false)
	const [refreshSignal, setRefreshSignal] = useState(0)

	useEffect(() => {
		if (isWaiting.current) return

		/**
		 * if we're currently throttling, schedule a refresh for when the throttle is over
		 */
		if (Date.now() < throttledUntil.current) {
			isWaiting.current = true
			setTimeout(() => {
				isWaiting.current = false
				setRefreshSignal(refreshSignal + 1)
			}, throttledUntil.current - Date.now())
			return
		}

		/**
		 * if we're not throttling, update the value and set the next throttling time
		 */
		setThrottledValue(value)
		throttledUntil.current = Date.now() + msWait
	}, [msWait, refreshSignal, value])

	/**
	 * pause when the document loses focus to prevent visual glitches
	 */
	useEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") {
			throttledUntil.current = Number.POSITIVE_INFINITY
		} else {
			throttledUntil.current = Date.now() + msWait
		}
	})

	return throttledValue
}
