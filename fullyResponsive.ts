import config from "libraryConfig"
import type { RuleSet } from "styled-components"
import { css } from "styled-components"
import media, {
	desktopBreakpoint,
	desktopDesignSize,
	mobileDesignSize,
	tabletDesignSize,
} from "styles/media"

const PRECISION = 3

const replacer = (match: string, breakpoint: number) => {
	return ((Number.parseFloat(match) / breakpoint) * 100).toFixed(PRECISION)
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
	cssIn: RuleSet<object> | string,
	{
		only,
		scaleFully,
	}: { only?: "mobile" | "tablet" | "desktop"; scaleFully?: boolean } = {},
) {
	// if not a string, convert to string
	const cssAsString =
		typeof cssIn === "string"
			? cssIn
			: cssIn
					.join("")
					// and convert multiline declarations to single line (for detection purposes)
					.replaceAll("\n", " ")
	const onlyPxValues = cssAsString
		.replaceAll("{", "{\n")
		.replaceAll("}", "\n}")
		.replaceAll(";", ";\n")
		.split("\n")
		.filter((x) => x.match(/px|{|}/g))
		.join("\n")

	/**
	 * detects pixel values, excluding those inside media queries
	 */
	const regex = /(?=[^{}@]*;)([\d.]+)px/g

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

	/**
	 * generate media queries for each breakpoint
	 */
	return css`
		/* static pixel values (as a baseline) */
		${cssAsString}

		/* convert full width values (not including smaller desktops that would always scale) */
		${media.fullWidth} {
			${
				scaleFully ?? config.scaleFully
					? onlyPxValues.replaceAll(
							/* scaling full width values */
							regex,
							(_, px: string) => `${replacer(px, desktopDesignSize)}vw`,
						)
					: onlyPxValues.replaceAll(
							// convert to px values at the fw breakpoint (this may be different than the raw px value, depending on the config)
							regex,
							(_, px: string) =>
								`${(
									(Number.parseFloat(replacer(px, desktopDesignSize)) / 100) *
									desktopBreakpoint
								).toFixed(1)}px`.replace(".0px", "px"),
						)
			}
		}

		/* convert desktop values (not including full width) */
		${media.desktop} {
			${onlyPxValues.replaceAll(
				regex,
				(_, px: string) => `${replacer(px, desktopDesignSize)}vw`,
			)}
		}

		/* convert tablet values */
		${media.tablet} {
			${onlyPxValues.replaceAll(
				regex,
				(_, px: string) => `${replacer(px, tabletDesignSize)}vw`,
			)}
		}

		/* convert mobile values */
		${media.mobile} {
			${onlyPxValues.replaceAll(
				regex,
				(_, px: string) => `${replacer(px, mobileDesignSize)}vw`,
			)}
		}
	`
}

const fresponsive = fullyResponsive

const fdesktop = (cssIn: RuleSet<object> | string) =>
	fullyResponsive(cssIn, { only: "desktop" })
const ftablet = (cssIn: RuleSet<object> | string) =>
	fullyResponsive(cssIn, { only: "tablet" })
const fmobile = (cssIn: RuleSet<object> | string) =>
	fullyResponsive(cssIn, { only: "mobile" })

export { fdesktop, fmobile, fresponsive, ftablet }
