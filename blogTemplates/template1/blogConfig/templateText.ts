import { leadingTrim } from "leading-trim"
import { fresponsive } from "library/fullyResponsive"
import { css } from "styled-components"

// TODO: Change these textStyles to match the project design.
export const projectTextStyles = {
	hubT: fresponsive(css`
    font-family: sans-serif;
    font-size: 68.5px;
    font-style: normal;
    font-weight: 400;
    line-height: 92%; /* 63.02px */
    letter-spacing: -4.11px;
  `),
	h5: fresponsive(css`
    font-family: sans-serif;
    font-size: 60px;
    font-style: normal;
    font-weight: 400;
    line-height: 94%; /* 56.4px */
    letter-spacing: -3px;
  `),
	h6: fresponsive(css`
    font-family: sans-serif;
    font-size: 48px;
    font-style: normal;
    font-weight: 400;
    line-height: 94%; /* 45.12px */
    letter-spacing: -2.88px;
  `),
	sh1: fresponsive(css`
    font-family: sans-serif;
    font-size: 24px;
    font-style: normal;
    font-weight: 500;
    line-height: 120%; /* 28.8px */
    letter-spacing: -0.96px;
  `),
	sh2: fresponsive(css`
    font-family: sans-serif;
    font-size: 18px;
    font-style: normal;
    font-weight: 500;
    line-height: 120%; /* 21.6px */
    letter-spacing: -0.72px;
  `),
	sh3: fresponsive(css`
    font-family: sans-serif;
    font-size: 14px;
    font-style: normal;
    font-weight: 500;
    line-height: 120%; /* 16.8px */
    letter-spacing: -0.42px;
  `),
	sh4: fresponsive(css`
    font-family: sans-serif;
    font-size: 12px;
    font-style: normal;
    font-weight: 500;
    line-height: 120%; /* 14.4px */
    letter-spacing: -0.36px;
  `),
	t2: fresponsive(css`
    font-family: sans-serif;
    font-size: 10px;
    font-style: normal;
    font-weight: 400;
    line-height: 152%; /* 15.2px */
    letter-spacing: 0.7px;
    text-transform: uppercase;
  `),
	t3: fresponsive(css`
    font-family: sans-serif;
    font-size: 6px;
    font-style: normal;
    font-weight: 400;
    line-height: 120%; /* 7.2px */
    letter-spacing: 0.48px;
    text-transform: uppercase;
  `),
	bodyXL: fresponsive(css`
    font-family: sans-serif;
    font-size: 24px;
    font-style: normal;
    font-weight: 350;
    line-height: 132%; /* 31.68px */
    letter-spacing: -0.48px;
  `),
	bodyL: fresponsive(css`
    font-family: sans-serif;
    font-size: 20px;
    font-style: normal;
    font-weight: 350;
    line-height: 132%; /* 26.4px */
    letter-spacing: -0.4px;
  `),
	bodyR: fresponsive(css`
    font-family: sans-serif;
    font-size: 16px;
    font-style: normal;
    font-weight: 350;
    line-height: 144%; /* 23.04px */
    letter-spacing: -0.32px;
  `),
	bodyS: fresponsive(css`
    font-family: sans-serif;
    font-size: 13px;
    font-style: normal;
    font-weight: 350;
    line-height: 144%; /* 23.04px */
    letter-spacing: -0.32px;
  `),
	bodyXS: fresponsive(css`
    font-family: sans-serif;
    font-size: 10px;
    font-style: normal;
    font-weight: 350;
    line-height: 144%; /* 14.4px */
    letter-spacing: -0.2px;
  `),
}

export const transparentText = css`
  /* stylelint-disable-next-line property-no-vendor-prefix  */
  -webkit-background-clip: text;
    /* stylelint-disable-next-line property-no-vendor-prefix  */
  -webkit-text-fill-color: transparent;
    /* stylelint-disable-next-line property-no-vendor-prefix  */
  -moz-text-fill-color: transparent;
  background-size: 100%;
  background-clip: text;
`

export const trim = (lineHeight: number) =>
	leadingTrim({
		lineHeight, // unitless `line-height` that you want for the text
		reference: {
			// reference numbers for the `@font-face` you'll use
			fontSize: 160, // `font-size` in px
			lineHeight: 1, // unitless `line-height`
			topCrop: 26, // height to remove from the top in px
			bottomCrop: 21, // height to remove from the bottom in px
		},
	})

export const clampText = (lines: number) => css`
  overflow: hidden;
  text-overflow: ellipsis;
    /* stylelint-disable-next-line property-no-vendor-prefix  */
  -webkit-text-overflow: ellipsis;
  display: -webkit-box;
    /* stylelint-disable-next-line property-no-vendor-prefix  */
  -webkit-box-orient: vertical;
    /* stylelint-disable-next-line property-no-vendor-prefix  */
  -webkit-line-clamp: ${lines};
`
