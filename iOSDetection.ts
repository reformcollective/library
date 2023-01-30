import { isBrowser } from "./functions"

const isIOS = () => {
  if (!isBrowser()) return false
  const userAgent = window.navigator.userAgent.toLowerCase()
  const userAgentMatch = /iphone|ipad|ipod/.test(userAgent)
  const isMacWithTouch =
    userAgent.includes("mac") && navigator.maxTouchPoints > 1

  return userAgentMatch || isMacWithTouch
}

export default isIOS
