import { GatsbyImage } from "gatsby-plugin-image"
import fullyResponsive from "library/fullyResponsive"
import UniversalLink from "library/Loader/UniversalLink"
import styled, { css } from "styled-components"

export const Code = styled.pre`
  ${fullyResponsive(css``)}
`

export const H1 = styled.h1`
  ${fullyResponsive(css``)}
`

export const H2 = styled.h2`
  ${fullyResponsive(css``)}
`

export const H3 = styled.h3`
  ${fullyResponsive(css``)}
`

export const H4 = styled(H3)`
  ${fullyResponsive(css``)}
`

export const H5 = styled(H3)``

export const H6 = styled(H3)``

export const P = styled.p`
  ${fullyResponsive(css``)}
`

export const Ul = styled.ul`
  ${fullyResponsive(css``)}
`

export const Ol = styled.ol`
  ${fullyResponsive(css``)}
`

export const Li = styled.li``

export const A = styled(UniversalLink)``

export const Quote = styled.div`
  ${fullyResponsive(css``)}
`

export const Strong = styled.strong``

export const U = styled.u``

export const Em = styled.em``

export const Image = styled(GatsbyImage)`
  ${fullyResponsive(css``)}
`
