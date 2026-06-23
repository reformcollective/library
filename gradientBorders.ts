import { css } from "./styled"

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
	border: ${borderSize}px solid transparent;
	background: ${gradient};
	background-position: 50% 50%;
	background-repeat: no-repeat;
	background-size: calc(100% + ${borderSize * 4}px)
		calc(100% + ${borderSize * 4}px);

	/* clip out the background so we get transparency */
	mask:
		/* stylelint-disable-next-line declaration-property-value-no-unknown */
		linear-gradient(#fff 0 0) padding-box,
		linear-gradient(#fff 0 0);
	/* stylelint-disable-next-line declaration-property-value-no-unknown */
	mask-composite: xor;
	mask-composite: exclude;
`

/**
 * generates a gradient border and puts it in a pseudo element before the element
 */
const gradientBorderPseudo =
	(type: string) =>
	(gradient: string, borderSize = 1) =>
		css`
			position: relative;
			isolation: isolate;

			&::${type} {
				position: absolute;
				z-index: 1;
				border-radius: inherit;
				content: "";
				inset: 0;
				pointer-events: none;
				${generateGradientBorder(gradient, borderSize)}
			}
		`

export const gradientBorderBefore = gradientBorderPseudo("before")
export const gradientBorderAfter = gradientBorderPseudo("after")
