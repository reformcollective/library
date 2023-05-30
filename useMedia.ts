import { startTransition, useCallback, useEffect, useState } from "react"

import { IGatsbyImageData } from "gatsby-plugin-image"

import {
  desktopAspectRatio as desktop,
  tabletAspectRatio as tablet,
  mobileAspectRatio as mobile,
} from "styles/media"

import { isBrowser } from "./functions"

export default function useMedia<
  // anything that doesn't change by reference
  InputType extends
    | string
    | number
    | boolean
    | null
    | undefined
    /**
     * image data technically changes by reference, but is stable when provided by gatsby
     */
    | IGatsbyImageData
>(fw: InputType, d: InputType, t: InputType, m: InputType) {
  const handleUpdate = useCallback(() => {
    if (isBrowser()) {
      startTransition(() => {
        const aspectRatio = window.innerWidth / window.innerHeight
        if (aspectRatio <= mobile) {
          setCurrent(m)
        } else if (aspectRatio <= tablet) {
          setCurrent(t)
        } else if (aspectRatio <= desktop) {
          setCurrent(d)
        } else setCurrent(fw)
      })
    }
  }, [fw, d, t, m])

  const [current, setCurrent] = useState(d)

  useEffect(() => {
    handleUpdate()
  }, [handleUpdate])

  useEffect(() => {
    if (isBrowser()) {
      window.addEventListener("resize", handleUpdate)
      return () => window.removeEventListener("resize", handleUpdate)
    }
  }, [handleUpdate])

  return current
}
