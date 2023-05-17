import { useEffect } from "react"

import { isBrowser } from "./functions"

// eslint-disable-next-line ssr-friendly/no-dom-globals-in-module-scope
const systemRequestFrame = isBrowser() ? requestAnimationFrame : undefined

const requests: FrameRequestCallback[] = []
let startIndex = 0

if (isBrowser()) {
  window.requestAnimationFrame = request => {
    requests.push(request)
    return startIndex + requests.length - 1
  }

  window.cancelAnimationFrame = (id: number) => {
    const indexToClear = id - startIndex
    if (indexToClear >= 0) {
      requests[indexToClear] = () => {}
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
  requestsCopy.forEach(r => r(time))
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
    systemRequestFrame?.(onFrame)
  }, [])

  useEffect(() => {
    const logFrameTimes = () => {
      if (!lastThirtySeconds.length) return
      let average = 0
      let max = -Infinity
      let min = Infinity
      lastThirtySeconds.forEach(time => {
        average += time
        max = Math.max(max, time)
        min = Math.min(min, time)
      })
      average /= lastThirtySeconds.length

      console.info(
        `Last 30s Frame Times: ${average.toFixed(2)}ms (min: ${min.toFixed(
          2
        )}ms, max: ${max.toFixed(2)}ms)`
      )
    }

    const interval = setInterval(logFrameTimes, 1000)
    return () => clearInterval(interval)
  }, [])
}
