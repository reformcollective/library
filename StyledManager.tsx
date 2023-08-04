import isPropValid from "@emotion/is-prop-valid"
import { StyleSheetManager } from "styled-components"

export default function StyledManager({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StyleSheetManager enableVendorPrefixes shouldForwardProp={isPropValid}>
      {children}
    </StyleSheetManager>
  )
}
