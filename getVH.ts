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
  document.body.append(div)
  return div
}

const measuringElement = createMeasuringElement()

/**
 * calculates a vh value based on the current vh
 * @param amount the amount of vh to get, e.g. 100vh = 100
 * @returns the calculated vh value in pixels
 */
export default function getVH(amount: number) {
  return ((measuringElement?.clientHeight ?? 0) / 100) * amount
}
