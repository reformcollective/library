"use client"

import { css, f, styled } from "library/styled"
import { buttonBase } from "./styles.css"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

const DEFAULT_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

export interface PlaybackRateButtonProps extends PartProps<"button"> {
	/** Rates to cycle through. Defaults to the source's own list when it reports one. */
	rates?: number[]
}

export function PlaybackRateButton({
	label,
	alwaysShow,
	children,
	rates,
	onClick,
	...rest
}: PlaybackRateButtonProps) {
	const { state, controller, support, visible, text } = usePart(["playbackRate"], alwaysShow)
	if (!visible) return null

	const sourceRates = controller.extras.youtube?.getAvailablePlaybackRates()
	const list = rates ?? (sourceRates && sourceRates.length > 0 ? sourceRates : DEFAULT_RATES)

	return (
		<Button
			type="button"
			aria-label={`${label ?? text("playbackRate")}, ${state.playbackRate}x`}
			data-state={String(state.playbackRate)}
			data-support={support}
			{...rest}
			onClick={(event) => {
				onClick?.(event)
				if (event.defaultPrevented) return
				const next = list.find((rate) => rate > state.playbackRate) ?? list[0]
				if (next !== undefined) controller.setPlaybackRate(next)
			}}
		>
			{resolveChildren(children, state, `${state.playbackRate}x`)}
		</Button>
	)
}

const Button = styled(
	"button",
	f.unresponsive(css`
		${buttonBase}
		font-size: inherit;
		font-variant-numeric: tabular-nums;
	`),
)
