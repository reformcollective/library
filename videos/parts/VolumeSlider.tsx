"use client"

import { createVar } from "@vanilla-extract/css"
import { css, f, styled } from "library/styled"
import { control } from "./styles.css"
import type { PartProps } from "./types"
import { usePart } from "./usePart"

export interface VolumeSliderProps extends Omit<PartProps<"input">, "children"> {
	/** Volume change per arrow key press, 0 to 1. Default 0.05 */
	keyStep?: number
}

export function VolumeSlider({
	label,
	alwaysShow,
	keyStep = 0.05,
	onChange,
	...rest
}: VolumeSliderProps) {
	const { state, controller, support, visible, text } = usePart(["volume"], alwaysShow)
	if (!visible) return null

	const value = state.muted ? 0 : state.volume
	const percent = Math.round(value * 100)

	return (
		<Input
			type="range"
			min={0}
			max={1}
			step={keyStep}
			value={value}
			aria-label={label ?? text("volume")}
			aria-valuetext={`${percent}%`}
			data-state={state.muted ? "muted" : "unmuted"}
			data-support={support}
			fill={percent}
			{...rest}
			onChange={(event) => {
				onChange?.(event)
				const next = event.currentTarget.valueAsNumber
				controller.setVolume(next)
				if (next > 0 && state.muted) controller.setMuted(false)
			}}
		/>
	)
}

const fillVar = createVar()

const Input = styled("input", {
	base: [
		f.unresponsive(css`
			${control}
			appearance: none;
			height: 24px;
			margin: 0;
			padding: 0;
			border: 0;
			border-radius: 12px;
			color: inherit;
			background: linear-gradient(
				to right,
				currentColor 0 ${fillVar},
				color-mix(in srgb, currentColor 20%, transparent) ${fillVar} 100%
			);
			background-size: 100% 4px;
			background-position: center;
			background-repeat: no-repeat;

			&::-webkit-slider-thumb {
				appearance: none;
				width: 12px;
				height: 12px;
				border: 0;
				border-radius: 50%;
				background: currentcolor;
			}

			&::-moz-range-thumb {
				width: 12px;
				height: 12px;
				border: 0;
				border-radius: 50%;
				background: currentcolor;
			}
		`),
	],
	tokens: {
		fill: { token: fillVar, unit: "%" },
	},
})
