import { leadingTrim } from "leading-trim"
import { fresponsive } from "library/fullyResponsive"
import { css } from "styled-components"

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

const textStyles = {
	h1: fresponsive(css`
    font-family: sans-serif;
    font-size: 160px;
    font-style: normal;
    font-weight: 400;
    line-height: 100%; /* 160px */
    letter-spacing: -6.4px;
  `),
	h2: fresponsive(css`
    font-family: sans-serif;
    font-size: 115px;
    font-style: normal;
    font-weight: 400;
    line-height: 100%; /* 115px */
    letter-spacing: -4.6px;
  `),
	h3: fresponsive(css`
    font-family: sans-serif;
    font-size: 90px;
    font-style: normal;
    font-weight: 400;
    line-height: 100%; /* 90px */
    letter-spacing: -3.6px;
  `),
	h4: fresponsive(css`
    font-family: sans-serif;
    font-size: 64px;
    font-style: normal;
    font-weight: 400;
    line-height: 100%; /* 64px */
    letter-spacing: -1.92px;
  `),
	h5: fresponsive(css`
    font-family: sans-serif;
    font-size: 48px;
    font-style: normal;
    font-weight: 400;
    line-height: 100%; /* 48px */
    letter-spacing: -1.44px;
  `),
	h6: fresponsive(css`
    font-family: sans-serif;
    font-size: 30px;
    font-style: normal;
    font-weight: 500;
    line-height: 120%; /* 36px */
    letter-spacing: -0.9px;
  `),
	bodyXL: fresponsive(css`
    font-family: sans-serif;
    font-size: 24px;
    font-style: normal;
    font-weight: 400;
    line-height: 120%; /* 28.8px */
    letter-spacing: -0.6px;
  `),
	bodyL: fresponsive(css`
    font-family: sans-serif;
    font-size: 20px;
    font-style: normal;
    font-weight: 400;
    line-height: 120%; /* 24px */
    letter-spacing: -0.5px;
  `),
	bodyR: fresponsive(css`
    font-family: sans-serif;
    font-size: 18px;
    font-style: normal;
    font-weight: 400;
    line-height: 120%; /* 21.6px */
    letter-spacing: -0.18px;
  `),
	bodyS: fresponsive(css`
    font-family: sans-serif;
    font-size: 16px;
    font-style: normal;
    font-weight: 400;
    line-height: 125%; /* 20px */
    letter-spacing: -0.16px;
  `),
	bodyXS: fresponsive(css`
    font-family: sans-serif;
    font-size: 12px;
    font-style: normal;
    font-weight: 400;
    line-height: 130%; /* 15.6px */
  `),
	bodyXXS: fresponsive(css`
    font-family: sans-serif;
    font-size: 10px;
    font-style: normal;
    font-weight: 400;
    line-height: 135%; /* 13.5px */
    letter-spacing: 0.1px;
  `),
	titleXL: fresponsive(css`
    font-family: sans-serif;
    font-size: 24px;
    font-style: normal;
    font-weight: 500;
    line-height: 120%; /* 28.8px */
    letter-spacing: -0.6px;
  `),
	titleL: fresponsive(css`
    font-family: sans-serif;
    font-size: 20px;
    font-style: normal;
    font-weight: 500;
    line-height: 120%; /* 24px */
    letter-spacing: -0.5px;
  `),
	titleR: fresponsive(css`
    font-family: sans-serif;
    font-size: 18px;
    font-style: normal;
    font-weight: 500;
    line-height: 120%; /* 21.6px */
    letter-spacing: -0.45px;
  `),
	titleS: fresponsive(css`
    font-family: sans-serif;
    font-size: 16px;
    font-style: normal;
    font-weight: 500;
    line-height: 120%; /* 19.2px */
    letter-spacing: -0.32px;
  `),
}

export const strokeText = css`
  /* styled doesn't prefix this property yet */
  /* stylelint-disable property-no-vendor-prefix */
  -webkit-background-clip: text;
  -moz-background-clip: text;
  -webkit-text-fill-color: transparent;
  -moz-text-fill-color: transparent;
  background-size: 100%;
  background-clip: text;
  -webkit-text-stroke-width: 0.07vw;
`

export const strokeTextTransparent = css`
  /* stylelint-disable-next-line property-no-vendor-prefix  */
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  -moz-text-fill-color: transparent;
  background-size: 100%;
  background-clip: text;
  -webkit-text-stroke-width: 0.07vw;
`

export const transparentText = css`
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  -moz-text-fill-color: transparent;
  background-size: 100%;
  background-clip: text;
`

export const clampText = (lines: number) => css`
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
`

export default textStyles
