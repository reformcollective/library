import { isBrowser } from "./functions"

export const isIOS = () => {
  if (!isBrowser()) return false
  const userAgent = window.navigator.userAgent.toLowerCase()
  const userAgentMatch = /iphone|ipad|ipod/.test(userAgent)
  const isMacWithTouch =
    userAgent.includes("mac") && navigator.maxTouchPoints > 1

  return userAgentMatch || isMacWithTouch
}

export const isAndroid = () => {
  if (!isBrowser()) return false
  const userAgent = window.navigator.userAgent.toLowerCase()
  return userAgent.includes("android")
}

export const isMobile = () => {
  return isIOS() || isAndroid()
}
