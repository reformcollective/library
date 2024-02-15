import { useEffect } from "react"

import { isBrowser } from "./functions"

const MAX_FRAME_TIME_MS = 0.5

const canTrackFrames = isBrowser() && window.location.href.includes("localhost")
const systemRequestFrame = canTrackFrames ? requestAnimationFrame : undefined

const requests: FrameRequestCallback[] = []
let startIndex = 0

if (canTrackFrames) {
	console.info("tracking frame times")
	window.requestAnimationFrame = (request) => {
		requests.push(request)
		return startIndex + requests.length - 1
	}

	window.cancelAnimationFrame = (id: number) => {
		const indexToClear = id - startIndex
		if (indexToClear >= 0) {
			requests[indexToClear] = () => {
				// this function replaces the callback, so it's a no-op
			}
		}
	}
}

const lastThirtySeconds: number[] = []

const onFrame = (time: number) => {
	systemRequestFrame?.(onFrame)
	const requestsCopy = [...requests]
	startIndex += requests.length
	requests.length = 0

	const frameStart = performance.now()
	for (const r of requestsCopy) {
		r(time)
	}
	const frameEnd = performance.now()

	if (frameStart > 5 * 1000) {
		const frameTime = frameEnd - frameStart
		lastThirtySeconds.push(frameTime)
		setTimeout(() => {
			lastThirtySeconds.shift()
		}, 30 * 1000)
	}
}

export default function useTrackFrameTime() {
	useEffect(() => {
		if (canTrackFrames) systemRequestFrame?.(onFrame)
	}, [])

	useEffect(() => {
		if (!canTrackFrames) return
		const logFrameTimes = () => {
			if (lastThirtySeconds.length === 0) return
			let average = 0
			let max = -Infinity
			let min = Infinity
			for (const time of lastThirtySeconds) {
				average += time
				max = Math.max(max, time)
				min = Math.min(min, time)
			}
			average /= lastThirtySeconds.length

			// console.info(
			//   `Last 30s Frame Times: ${average.toFixed(2)}ms (min: ${min.toFixed(
			//     2
			//   )}ms, max: ${max.toFixed(2)}ms)`
			// )
			if (average > MAX_FRAME_TIME_MS) {
				console.warn(
					`

High frame times in the last 30s. Check your performance!

  Average: ${average.toFixed(2)}ms
  Min: ${min.toFixed(2)}ms
  Max: ${max.toFixed(2)}ms`,
				)
			}
		}

		const interval = setInterval(logFrameTimes, 10_000)
		return () => clearInterval(interval)
	}, [])
}
