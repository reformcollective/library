import { useState, useEffect } from "react"

import {
  desktopDesignSize,
  getBreakpoint,
  mobileDesignSize,
  tabletDesignSize,
} from "styles/media"

import { isBrowser } from "./functions"

const createMeasuringElement = () => {
  if (!isBrowser()) return
  const div = document.createElement("div")
  div.style.position = "absolute"
  div.style.top = "0"
  div.style.left = "0"
  div.style.width = "100vw"
  div.style.height = "100vh"
  div.style.visibility = "hidden"
  document.body.appendChild(div)
  return div
}

const measuringElement = createMeasuringElement()

/**
 * hookify a get function to update on resize
 */
function useHookify<P, R, T extends (input: P) => R>(fn: T, arg: P) {
  const [value, setValue] = useState<R>()
  useEffect(() => {
    const handleResize = () => setValue(fn(arg))

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [fn, arg])
  return value
}

/**
 * calculates a vh value based on the current viewport
 * @param amount the number of vh to get, e.g. 100vh would be 100
 * @returns the calculated vh value in pixels
 */
export function getVH(amount: number) {
  return ((measuringElement?.clientHeight ?? 0) / 100) * amount
}

/**
 * calculates a vh value based on the current viewport
 * @param amount the number of vh to get, e.g. 100vh would be 100
 * @returns the calculated vh value in pixels
 */
export function useVH(amount: number) {
  return useHookify(getVH, amount)
}

/**
 * calculates a vw value based on the current viewport width
 * @param px the number of pixels to convert to vw
 * @returns the calculated vw value
 */
export function getPxToVw(px: number) {
  const currentBreakpoint = getBreakpoint()

  let conversionValue = desktopDesignSize
  if (currentBreakpoint === "mobile") {
    conversionValue = mobileDesignSize
  } else if (currentBreakpoint === "tablet") {
    conversionValue = tabletDesignSize
  }

  if (isBrowser()) {
    const vw = px / (conversionValue / 100)
    return vw
  }
  return 0
}

/**
 * calculates a vw value based on the current viewport width
 * @param px the number of pixels to convert to vw
 * @returns the calculated vw value
 */
export function usePxToVw(px: number) {
  return useHookify(getPxToVw, px)
}

/**
 * gets a pixel value based on a vw value
 * @param vw the vw value to convert to pixels
 * @returns the calculated pixel value
 */
export function getVwToPx(vw: number) {
  if (isBrowser()) {
    const px = vw * (window.innerWidth / 100)
    return px
  }
  return 0
}

/**
 * gets a pixel value based on a vw value
 * @param vw the vw value to convert to pixels
 * @returns the calculated pixel value
 */
export function useVwToPx(vw: number) {
  return useHookify(getVwToPx, vw)
}
