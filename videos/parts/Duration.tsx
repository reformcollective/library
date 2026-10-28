"use client"

import { css, f, styled } from "library/styled"
import { formatIsoDuration, formatTime } from "./format"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

export function Duration({
	label,
	alwaysShow,
	children,
	...rest
}: PartProps<"time">) {
	const { state, support, visible, text } = usePart(["timeRead"], alwaysShow)
	if (!visible) return null

	return (
		<Time
			dateTime={formatIsoDuration(state.duration)}
			aria-label={label}
			data-state={state.status}
			data-live={state.isLive}
			data-support={support}
			{...rest}
		>
			{resolveChildren(
				children,
				state,
				state.isLive ? text("live") : formatTime(state.duration),
			)}
		</Time>
	)
}

const Time = styled(
	"time",
	f.unresponsive(css`
		font-variant-numeric: tabular-nums;
	`),
)
