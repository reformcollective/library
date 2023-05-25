import { startTransition, useCallback, useEffect, useState } from "react"

import { IGatsbyImageData } from "gatsby-plugin-image"

import {
  desktopBreakpoint as desktop,
  tabletBreakpoint as tablet,
  mobileBreakpoint as mobile,
} from "styles/media"
import { GatsbyImageType } from "types"

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
    | IGatsbyImageData[]
    | GatsbyImageType[]
>(fw: InputType, d: InputType, t: InputType, m: InputType) {
  const handleUpdate = useCallback(() => {
    if (isBrowser()) {
      startTransition(() => {
        if (window.innerWidth > desktop) {
          setCurrent(fw)
        } else if (window.innerWidth > tablet) {
          setCurrent(d)
        } else if (window.innerWidth > mobile) {
          setCurrent(t)
        } else setCurrent(m)
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
