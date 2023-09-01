import config from "libraryConfig"
import type { FlattenSimpleInterpolation } from "styled-components"
import { css } from "styled-components"
import media, {
  desktopDesignSize,
  mobileDesignSize,
  tabletDesignSize,
} from "styles/media"

const PRECISION = 3

const replacer = (match: string, breakpoint: number) => {
  return ((parseFloat(match) / breakpoint) * 100).toFixed(PRECISION)
}

const designSizes = {
  desktop: desktopDesignSize,
  tablet: tabletDesignSize,
  mobile: mobileDesignSize,
}

/**
 * takes in css containing pixel values and generates scaling media queries using the breakpoints
 * @param cssIn
 * @returns
 */
export default function fullyResponsive(
  cssIn: FlattenSimpleInterpolation | string,
  only?: "mobile" | "tablet" | "desktop",
) {
  // if not a string, convert to string
  const cssAsString = typeof cssIn === "string" ? cssIn : cssIn.join("")
  const onlyPxValues = cssAsString
    .replaceAll("{", "{\n")
    .replaceAll("}", "\n}")
    .replaceAll(";", ";\n")
    .split("\n")
    .filter(x => x.match(/px|{|}/g))
    .join("\n")

  const regex = /(?=[\S ]*;)([\d.]+)px/g

  /**
   * generate media query for a single breakpoint
   */
  if (only) {
    return css`
      ${media[only]} {
        ${cssAsString.replaceAll(
          regex,
          (_, px: string) => `${replacer(px, designSizes[only])}vw`,
        )}
      }
    `
  }

  // generate media queries for each breakpoint
  return css`
    ${cssAsString}
    ${config.scaleFully &&
    css`
      ${media.fullWidth} {
        ${onlyPxValues.replaceAll(
          regex,
          (_, px: string) => `${replacer(px, desktopDesignSize)}vw`,
        )}
      }
    `};

    ${media.desktop} {
      ${onlyPxValues.replaceAll(
        regex,
        (_, px: string) => `${replacer(px, desktopDesignSize)}vw`,
      )}
    }

    ${media.tablet} {
      ${onlyPxValues.replaceAll(
        regex,
        (_, px: string) => `${replacer(px, tabletDesignSize)}vw`,
      )}
    }

    ${media.mobile} {
      ${onlyPxValues.replaceAll(
        regex,
        (_, px: string) => `${replacer(px, mobileDesignSize)}vw`,
      )}
    }
  `
}

const fresponsive = fullyResponsive

const fdesktop = (cssIn: FlattenSimpleInterpolation | string) =>
  fullyResponsive(cssIn, "desktop")
const ftablet = (cssIn: FlattenSimpleInterpolation | string) =>
  fullyResponsive(cssIn, "tablet")
const fmobile = (cssIn: FlattenSimpleInterpolation | string) =>
  fullyResponsive(cssIn, "mobile")

export { fdesktop, fmobile, fresponsive, ftablet }
