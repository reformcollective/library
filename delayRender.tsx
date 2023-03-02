import { useEffect, useState } from "react"

const queue: VoidFunction[] = []
let queueIsRunning = false

/**
 * delay rendering of any children until we're idle
 *
 * generally this should be avoided, but it can be useful
 */
export default function DelayRender({
  children,
}: {
  children: React.ReactNode | React.ReactNode[]
}): JSX.Element | null {
  const [isIdle, setIsIdle] = useState(false)

  useEffect(() => {
    queue.push(() => {})
    queue.push(() => setIsIdle(true))
    queue.push(() => {})
    if (!queueIsRunning) runQueue()
  }, [])

  if (Array.isArray(children)) {
    return (
      <>
        {children.map((child, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <DelayRender key={i}>{child}</DelayRender>
        ))}
      </>
    )
  }

  return isIdle ? <>{children}</> : null
}

const runQueue = () => {
  queueIsRunning = true
  const next = queue.shift()
  if (next) {
    const runNext = () => {
      next()
      runQueue()
    }
    if ("requestIdleCallback" in window) requestIdleCallback(runNext)
    else requestAnimationFrame(runNext)
  } else {
    queueIsRunning = false
  }
}
