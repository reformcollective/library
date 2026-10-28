"use client"

import { f, styled } from "library/styled"
import { selectBase } from "./styles.css"
import type { PartProps } from "./types"
import { usePart } from "./usePart"

export interface QualityMenuProps
	extends Omit<PartProps<"select">, "children"> {
	/** Text of the automatic option. Default "Auto" */
	autoLabel?: string
}

export function QualityMenu({
	label,
	alwaysShow,
	autoLabel = "Auto",
	onChange,
	...rest
}: QualityMenuProps) {
	const { state, controller, support, visible, text } = usePart(
		["qualitySelect", "qualityCap"],
		alwaysShow,
	)
	if (!visible || (state.qualities.length === 0 && !alwaysShow)) return null

	return (
		<Select
			aria-label={label ?? text("quality")}
			value={state.activeQuality ?? ""}
			data-state={state.activeQuality ?? "auto"}
			data-support={support}
			{...rest}
			onChange={(event) => {
				onChange?.(event)
				const value = event.currentTarget.value
				controller.setQuality(value === "" ? null : value)
			}}
		>
			<option value="">{autoLabel}</option>
			{state.qualities.map((quality) => (
				<option key={quality.id} value={quality.id}>
					{quality.label}
				</option>
			))}
		</Select>
	)
}

const Select = styled("select", [f.unresponsive(selectBase)])
