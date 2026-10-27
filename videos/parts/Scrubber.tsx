"use client"

import { createVar } from "@vanilla-extract/css"
import { css, f, styled } from "library/styled"
import { useState } from "react"
import { formatTime } from "./format"
import { control } from "./styles.css"
import type { PartProps } from "./types"
import { usePart } from "./usePart"

export interface ScrubberProps extends Omit<PartProps<"input">, "children"> {
	/** Seconds moved by the arrow keys. Default 5 */
	keyStep?: number
}

export function Scrubber({
	label,
	alwaysShow,
	keyStep = 5,
	onChange,
	onKeyDown,
	onPointerDown,
	onPointerUp,
	onPointerCancel,
	onBlur,
	...rest
}: ScrubberProps) {
	const { state, controller, support, visible, text } = usePart(["seek"], alwaysShow)
	const [draft, setDraft] = useState<number | null>(null)
	if (!visible) return null

	const duration = Number.isFinite(state.duration) ? state.duration : 0
	const value = Math.min(draft ?? state.currentTime, duration)
	const progress = duration > 0 ? (value / duration) * 100 : 0
	const buffered = duration > 0 ? Math.min(state.bufferedEnd / duration, 1) * 100 : 0
	const valueText = `${formatTime(value)} of ${formatTime(duration)}`

	const commit = () => {
		if (draft === null) return
		controller.seek(draft)
		setDraft(null)
	}

	return (
		<Input
			type="range"
			min={0}
			max={duration}
			step="any"
			value={value}
			disabled={duration <= 0}
			aria-label={label ?? text("seek")}
			aria-valuetext={valueText}
			data-state={state.status}
			data-support={support}
			progress={progress}
			buffered={buffered}
			{...rest}
			onPointerDown={(event) => {
				onPointerDown?.(event)
				setDraft(value)
			}}
			onPointerUp={(event) => {
				onPointerUp?.(event)
				commit()
			}}
			onPointerCancel={(event) => {
				onPointerCancel?.(event)
				commit()
			}}
			onBlur={(event) => {
				onBlur?.(event)
				commit()
			}}
			onChange={(event) => {
				onChange?.(event)
				const next = event.currentTarget.valueAsNumber
				if (draft === null) controller.seek(next)
				else setDraft(next)
			}}
			onKeyDown={(event) => {
				onKeyDown?.(event)
				if (event.defaultPrevented) return
				if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
					event.preventDefault()
					controller.seekBy(-keyStep)
				}
				if (event.key === "ArrowRight" || event.key === "ArrowUp") {
					event.preventDefault()
					controller.seekBy(keyStep)
				}
			}}
		/>
	)
}

const progressVar = createVar()
const bufferedVar = createVar()

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
				currentColor 0 ${progressVar},
				color-mix(in srgb, currentColor 40%, transparent) ${progressVar} ${bufferedVar},
				color-mix(in srgb, currentColor 20%, transparent) ${bufferedVar} 100%
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

			&:disabled {
				cursor: default;
			}
		`),
	],
	tokens: {
		progress: { token: progressVar, unit: "%" },
		buffered: { token: bufferedVar, unit: "%" },
	},
})
