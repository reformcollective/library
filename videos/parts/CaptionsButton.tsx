"use client"

import { f, styled } from "library/styled"
import { selectBase } from "./styles.css"
import type { PartProps } from "./types"
import { usePart } from "./usePart"

export function CaptionsButton({
	label,
	alwaysShow,
	onChange,
	...rest
}: Omit<PartProps<"select">, "children">) {
	const { state, controller, support, visible, text } = usePart(["captions"], alwaysShow)
	if (!visible || (state.textTracks.length === 0 && !alwaysShow)) return null

	return (
		<Select
			aria-label={label ?? text("captions")}
			value={state.activeTextTrack ?? ""}
			data-state={state.activeTextTrack === null ? "off" : "on"}
			data-support={support}
			{...rest}
			onChange={(event) => {
				onChange?.(event)
				const value = event.currentTarget.value
				controller.setTextTrack(value === "" ? null : value)
			}}
		>
			<option value="">{text("captionsOff")}</option>
			{state.textTracks.map((track) => (
				<option key={track.id} value={track.id}>
					{track.label}
				</option>
			))}
		</Select>
	)
}

const Select = styled("select", [f.unresponsive(selectBase)])
