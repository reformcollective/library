import { css } from "library/styled"

export const control = css`
	min-width: 24px;
	min-height: 24px;
	cursor: pointer;

	&:focus-visible {
		outline: 2px solid currentcolor;
		outline-offset: 2px;
	}
`

export const buttonBase = css`
	${control}
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: 0;
	background: none;
	color: inherit;
	font: inherit;
	font-size: 24px;

	& > svg {
		width: 1em;
		height: 1em;
	}
`

export const selectBase = css`
	${control}
	color: inherit;
	font: inherit;
`

export const visuallyHidden = css`
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
`
