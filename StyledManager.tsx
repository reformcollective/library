import isPropValid from "@emotion/is-prop-valid"
import { useEffect, useRef } from "react"
import { StyleSheetManager } from "styled-components"

export default function StyledManager({
  children,
}: {
  children: React.ReactNode
}) {
  const isValidConfig = useRef(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isValidConfig.current)
        console.warn(
          "StyledManager isn't doing anything, which may cause react errors! Is it set up correctly? It must go in wrapPageElement, not wrapRootElement.",
        )
    }, 1000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <StyleSheetManager
      enableVendorPrefixes
      shouldForwardProp={e => {
        if (e === "image") return true
        isValidConfig.current = true
        return isPropValid(e)
      }}
    >
      {children}
    </StyleSheetManager>
  )
}
