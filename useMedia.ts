import { startTransition, useCallback, useEffect, useState } from "react"
import {
  desktopBreakpoint as desktop,
  mobileBreakpoint as mobile,
  tabletBreakpoint as tablet,
} from "styles/media"

import type { UniversalImageData } from "./UniversalImage"
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
    | UniversalImageData,
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

  const [current, setCurrent] = useState(m)

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
