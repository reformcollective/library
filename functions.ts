export const isBrowser = () => typeof window !== "undefined"

export const addDebouncedEventListener = (
  element: Window | HTMLElement,
  event: string,
  callback: () => void,
  delay: number
) => {
  let timeout: NodeJS.Timeout

  const debouncedCallback = () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => callback(), delay)
  }

  element.addEventListener(event, debouncedCallback)
  return () => element.removeEventListener(event, debouncedCallback)
}

/**
 * @deprecated see viewportUtils.ts
 */
export const vwToPx = (vw: number) => {
  if (isBrowser()) {
    const px = vw * (window.innerWidth / 100)
    return px
  }
  return 0
}

/**
 * @deprecated see viewportUtils.ts
 */
export const pxToVw = (px: number, breakpoint: number) => {
  if (isBrowser()) {
    const vw = px / (breakpoint / 100)
    return vw
  }
}

/**
 * @deprecated see viewportUtils.ts
 */
export const vhToPx = (vh: number) => {
  if (isBrowser()) {
    const px = (vh * window.innerHeight) / 100
    return px
  }
  return 0
}

export const sleep = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms)
  })

export function pathnameMatches(pathA: string, pathB: string) {
  return pathA === pathB || pathA === `${pathB}/` || pathB === `${pathA}/`
}

export const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}
