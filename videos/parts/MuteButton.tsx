"use client"

import { f, styled } from "library/styled"
import VolumeHighIcon from "./icons/volume-high.inline.svg"
import VolumeMutedIcon from "./icons/volume-muted.inline.svg"
import { buttonBase } from "./styles.css"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

export function MuteButton({
	label,
	alwaysShow,
	children,
	onClick,
	...rest
}: PartProps<"button">) {
	const { state, controller, support, visible, text } = usePart(
		["muted"],
		alwaysShow,
	)
	if (!visible) return null

	const muted = state.muted || state.volume === 0
	const name = label ?? (muted ? text("unmute") : text("mute"))

	return (
		<Button
			type="button"
			aria-label={name}
			data-state={muted ? "muted" : "unmuted"}
			data-support={support}
			{...rest}
			onClick={(event) => {
				onClick?.(event)
				if (event.defaultPrevented) return
				controller.setMuted(!muted)
			}}
		>
			{resolveChildren(
				children,
				state,
				muted ? <VolumeMutedIcon /> : <VolumeHighIcon />,
			)}
		</Button>
	)
}

const Button = styled("button", [f.unresponsive(buttonBase)])
