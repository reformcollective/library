"use client"

import { css, f, styled } from "library/styled"
import { formatTime } from "./format"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

export function TimeDisplay({
	label,
	alwaysShow,
	children,
	...rest
}: PartProps<"span">) {
	const { state, support, visible, text } = usePart(["timeRead"], alwaysShow)
	if (!visible) return null

	const fallback = state.isLive
		? text("live")
		: `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`

	return (
		<Span
			aria-label={label}
			data-state={state.status}
			data-live={state.isLive}
			data-support={support}
			{...rest}
		>
			{resolveChildren(children, state, fallback)}
		</Span>
	)
}

const Span = styled(
	"span",
	f.unresponsive(css`
		font-variant-numeric: tabular-nums;
	`),
)
