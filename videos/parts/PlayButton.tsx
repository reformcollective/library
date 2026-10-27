"use client"

import { f, styled } from "library/styled"
import PauseIcon from "./icons/pause.inline.svg"
import PlayIcon from "./icons/play.inline.svg"
import ReplayIcon from "./icons/replay.inline.svg"
import { buttonBase } from "./styles.css"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

export function PlayButton({
	label,
	alwaysShow,
	children,
	onClick,
	...rest
}: PartProps<"button">) {
	const { state, controller, support, visible, text } = usePart(["play"], alwaysShow)
	if (!visible) return null

	const playing = state.status === "playing"
	const name = label ?? (playing ? text("pause") : text("play"))
	const icon = state.ended ? <ReplayIcon /> : playing ? <PauseIcon /> : <PlayIcon />

	return (
		<Button
			type="button"
			aria-label={name}
			data-state={state.status}
			data-support={support}
			{...rest}
			onClick={(event) => {
				onClick?.(event)
				if (event.defaultPrevented) return
				if (state.ended) controller.restart()
				else controller.toggle()
			}}
		>
			{resolveChildren(children, state, icon)}
		</Button>
	)
}

const Button = styled("button", [f.unresponsive(buttonBase)])
