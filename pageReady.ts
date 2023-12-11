import { useEffect } from "react"

let waitingForPage = true

const promisesToResolveOnReady: VoidFunction[] = []
const promisesToResolveOnUnmount: VoidFunction[] = []

export function useTrackPageReady() {
  useEffect(() => {
    waitingForPage = false
    promisesToResolveOnReady.forEach((fn) => fn())
    promisesToResolveOnReady.length = 0

    return () => {
      waitingForPage = true
      promisesToResolveOnUnmount.forEach((fn) => fn())
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
