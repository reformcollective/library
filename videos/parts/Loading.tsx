"use client"

import { keyframes } from "@vanilla-extract/css"
import { css, f, styled } from "library/styled"
import SpinnerIcon from "./icons/spinner.inline.svg"
import { visuallyHidden } from "./styles.css"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

export function Loading({ label, alwaysShow, children, ...rest }: PartProps<"div">) {
	const { state, placement, visible, text } = usePart([], alwaysShow)
	const loading = (state.status === "loading" && state.wanted === "play") || state.waiting
	if (!visible || (!loading && !alwaysShow)) return null

	const name = label ?? text("loading")

	return (
		<Box role="status" data-placement={placement} data-state={state.status} {...rest}>
			{resolveChildren(
				children,
				state,
				<>
					<Spinner />
					<Hidden>{name}</Hidden>
				</>,
			)}
		</Box>
	)
}

const spin = keyframes({
	to: { transform: "rotate(360deg)" },
})

const Box = styled(
	"div",
	f.unresponsive(css`
		display: grid;
		place-items: center;
		pointer-events: none;

		&[data-placement="overlay"] {
			position: absolute;
			inset: 0;
		}
	`),
)

const Spinner = styled(
	SpinnerIcon,
	f.unresponsive(css`
		width: 32px;
		height: 32px;

		@media (prefers-reduced-motion: no-preference) {
			animation: ${spin} 1s linear infinite;
		}
	`),
)

const Hidden = styled("span", f.unresponsive(visuallyHidden))
