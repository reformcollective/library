"use client"

import { f, styled } from "library/styled"
import { formatTime } from "./format"
import { selectBase } from "./styles.css"
import type { PartProps } from "./types"
import { usePart } from "./usePart"

export function ChaptersMenu({
	label,
	alwaysShow,
	onChange,
	...rest
}: Omit<PartProps<"select">, "children">) {
	const { state, controller, support, visible, text } = usePart(["chapters"], alwaysShow)
	if (!visible || (state.chapters.length === 0 && !alwaysShow)) return null

	return (
		<Select
			aria-label={label ?? text("chapters")}
			value={state.activeChapter === null ? "" : String(state.activeChapter)}
			data-state={state.activeChapter === null ? "none" : String(state.activeChapter)}
			data-support={support}
			{...rest}
			onChange={(event) => {
				onChange?.(event)
				const index = Number(event.currentTarget.value)
				if (Number.isInteger(index)) controller.setChapter(index)
			}}
		>
			{state.activeChapter === null && <option value="" />}
			{state.chapters.map((chapter, index) => (
				<option key={`${chapter.startTime}-${chapter.title}`} value={String(index)}>
					{`${chapter.title} (${formatTime(chapter.startTime)})`}
				</option>
			))}
		</Select>
	)
}

const Select = styled("select", [f.unresponsive(selectBase)])
