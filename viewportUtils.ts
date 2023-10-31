import config from "libraryConfig"
import { useEffect, useState } from "react"
import {
  desktopBreakpoint,
  desktopDesignSize,
  mobileBreakpoint,
  mobileDesignSize,
  tabletBreakpoint,
  tabletDesignSize,
} from "styles/media"

import { isBrowser } from "./functions"
import getMedia from "./getMedia"

/**
 * hookify a get function to update on resize
 */
function useHookify<P, T extends (input: P) => ReturnType<T>>(
  fn: T,
  arg: P,
): ReturnType<T> {
  const [value, setValue] = useState<ReturnType<T>>(fn(arg))
  useEffect(() => {
    const handleResize = () => setValue(fn(arg))

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [fn, arg])
  return value
}

/**
 * create an element that can be used to measure the viewport size,
 * since VH can't be calculated without it
 */
const createMeasuringElement = () => {
  if (!isBrowser()) return
  const div = document.createElement("div")
  div.style.position = "absolute"
  div.style.top = "0"
  div.style.left = "0"
  div.style.width = "100%"
  div.style.height = "100vh"
  div.style.visibility = "hidden"
  document.body.append(div)
  return div
}
const measuringElement = createMeasuringElement()

/**
 * calculates a vh value based on the current viewport
 *
 * for an updating value, use useVH
 *
 * @param amount the number of vh to get, e.g. 100vh would be 100
 * @returns the calculated vh value in pixels
 */
export function getVH(amount: number) {
  return ((measuringElement?.clientHeight ?? 0) / 100) * amount
}

/**
 * calculates a vh value based on the current viewport
 *
 * for a one-shot calculation, use getVH
 *
 * @param amount the number of vh to get, e.g. 100vh would be 100
 * @returns the calculated vh value in pixels
 */
export function useVH(amount: number) {
  return useHookify(getVH, amount)
}

/**
 * gets the name of the current breakpoint
 *
 * for an updating value, use useBreakpoint
 */
export const getBreakpoint = () => {
  if (typeof window === "undefined") return "mobile"

  const { innerWidth } = window

  if (innerWidth <= mobileBreakpoint) return "mobile"
  if (innerWidth <= tabletBreakpoint) return "tablet"
  if (innerWidth <= desktopBreakpoint) return "desktop"
  return "fullWidth"
}

/**
 * gets the name of the current breakpoint
 *
 * for a one-shot calculation, use getBreakpoint
 */
export const useBreakpoint = () => {
  return useHookify(getBreakpoint, null)
}

/**
 * calculates a vw value based on the current viewport width
 *
 * for an updating value, use usePxToVw
 *
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
    return px / (conversionValue / 100)
  }
  return 0
}

/**
 * calculates a vw value based on the current viewport width
 *
 * for a one-shot calculation, use getPxToVw
 *
 * @param px the number of pixels to convert to vw
 * @returns the calculated vw value
 */
export function usePxToVw(px: number) {
  return useHookify(getPxToVw, px)
}

/**
 * gets a pixel value based on a vw value
 *
 * for an updating value, use useVwToPx
 *
 * @param vw the vw value to convert to pixels
 * @returns the calculated pixel value
 */
export function getVwToPx(vw: number) {
  if (isBrowser()) {
    return vw * (window.innerWidth / 100)
  }
  return 0
}

/**
 * gets a pixel value based on a vw value
 *
 * for a one-shot calculation, use getVwToPx
 *
 * @param vw the vw value to convert to pixels
 * @returns the calculated pixel value
 */
export function useVwToPx(vw: number) {
  return useHookify(getVwToPx, vw)
}

/**
 * given a pixel value, scale it with the current viewport width
 * for example, 720 pixels would be 50vw on a 1440px wide screen
 * which would always scale to half the screen width
 *
 * for an updating value, use useResponsivePixels
 *
 * @param px the number of pixels to scale
 * @returns the calculated px value
 */
export function getResponsivePixels(px: number) {
  const value = getVwToPx(getPxToVw(px))

  // short circuit if we're not using responsive pixels
  if (!config.scaleFully) return getMedia(px, value, value, value)

  return value
}

/**
 * given a pixel value, scale it with the current viewport width
 * for example, 720 pixels would be 50vw on a 1440px wide screen
 * which would always scale to half the screen width
 *
 * for a one-shot calculation, use getResponsivePixels
 *
 * @param px the number of pixels to scale
 * @returns the calculated px value
 */
export function useResponsivePixels(px: number) {
  return useHookify(getResponsivePixels, px)
}
