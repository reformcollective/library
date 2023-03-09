import { startTransition, useCallback, useEffect, useState } from "react"

import {
  desktopBreakpoint as desktop,
  tabletBreakpoint as tablet,
  mobileBreakpoint as mobile,
} from "styles/media"

import { isBrowser } from "./functions"

export default function useMedia<InputType>(
  fw: InputType,
  d: InputType,
  t: InputType,
  m: InputType
) {
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
