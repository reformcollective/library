import { fresponsive } from "library/fullyResponsive"
import { css } from "styled-components"

/**
 * generates CSS for a gradient border with a transparent background
 *
 * if you also need a non-transparent background, you'll need to use a pseudo element
 *
 * @param gradient - the gradient to use for the border
 * @param borderSize - the size of the border in pixels
 */
export const generateGradientBorder = (
	gradient: string,
	borderSize: number,
) => css`
	/* make the background the gradient */
	${fresponsive(css`
		border: ${borderSize}px solid transparent;
		background: ${gradient};
		background-size: calc(100% + ${borderSize * 2}px)
			calc(100% + ${borderSize * 2}px);
		background-position: center;
	`)}

	/* clip out the background so we get transparency */
	mask:
		linear-gradient(#fff 0 0) padding-box,
		linear-gradient(#fff 0 0);
	mask-composite: xor;
	mask-composite: exclude;
`
