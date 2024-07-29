import { css } from "styled-components"

/**
 * a selector to use when applying styles to auto-filled inputs
 * be aware that browsers may attempt to change the text and background colors
 *
 * @example
 * ```tsx
 * const Control = styled(Form.Control)`
 *   ${inputAutofill} {
 *     color: white;
 *     background: black;
 *   }
 * `
 * ```
 */
export const inputAutofill = `
  &:autofill,
  &[data-com-onepassword-filled]
`

export const svgColor = (color: string) => css`
	*[fill]:not([fill="none"], .color-ignore) {
		fill: ${color};
	}

	*[stroke]:not([stroke="none"], .color-ignore) {
		stroke: ${color};
	}
`
