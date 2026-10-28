"use client"

import { f, styled } from "library/styled"
import { selectBase } from "./styles.css"
import type { PartProps } from "./types"
import { usePart } from "./usePart"

export function AudioTrackMenu({
	label,
	alwaysShow,
	onChange,
	...rest
}: Omit<PartProps<"select">, "children">) {
	const { state, controller, support, visible, text } = usePart(
		["audioTracks"],
		alwaysShow,
	)
	if (!visible || (state.audioTracks.length < 2 && !alwaysShow)) return null

	return (
		<Select
			aria-label={label ?? text("audioTrack")}
			value={state.activeAudioTrack ?? ""}
			data-state={state.activeAudioTrack ?? "none"}
			data-support={support}
			{...rest}
			onChange={(event) => {
				onChange?.(event)
				controller.setAudioTrack(event.currentTarget.value)
			}}
		>
			{state.audioTracks.map((track) => (
				<option key={track.id} value={track.id}>
					{track.label}
				</option>
			))}
		</Select>
	)
}

const Select = styled("select", [f.unresponsive(selectBase)])
