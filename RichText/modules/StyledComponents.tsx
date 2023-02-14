import { GatsbyImage } from "gatsby-plugin-image"
import styled, { css } from "styled-components"

import fullyResponsive from "library/fullyResponsive"
import UniversalLink from "library/Loader/UniversalLink"

export const Code = styled.pre`
  ${fullyResponsive(css`

  `)}
`

export const H1 = styled.h1`
  ${fullyResponsive(css`

  `)}
`

export const H2 = styled.h2`
  ${fullyResponsive(css`

  `)}
`

export const H3 = styled.h3`
  ${fullyResponsive(css`

  `)}
`

export const H4 = styled(H3)`
  ${fullyResponsive(css`

  `)}
`

export const H5 = styled(H3)`
  
`

export const H6 = styled(H3)`

`

export const P = styled.p`
  ${fullyResponsive(css`

  `)}
`

export const UL = styled.ul`
  ${fullyResponsive(css`

  `)}
`

export const OL = styled.ol`
  ${fullyResponsive(css`

  `)}
`

export const LI = styled.li`

`

export const A = styled(UniversalLink)`

`

export const Quote = styled.div`
  ${fullyResponsive(css`

  `)}
`

export const Strong = styled.strong`

`

export const U = styled.u`

`

export const EM = styled.em`

`

export const Image = styled(GatsbyImage)`
  ${fullyResponsive(css`

  `)}
`
