"use client"

import { css, f, styled } from "library/styled"
import PlayIcon from "./icons/play.inline.svg"
import { buttonBase } from "./styles.css"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

export function PlayOverlay({
	label,
	alwaysShow,
	children,
	onClick,
	...rest
}: PartProps<"button">) {
	const { state, controller, support, visible, text } = usePart(["play"], alwaysShow)
	const shown = state.status === "idle" || state.status === "blocked"
	if (!visible || (!shown && !alwaysShow)) return null

	return (
		<Overlay
			type="button"
			aria-label={label ?? text("playOverlay")}
			data-state={state.status}
			data-support={support}
			{...rest}
			onClick={(event) => {
				onClick?.(event)
				if (event.defaultPrevented) return
				void controller.play({ origin: "user" }).catch(() => undefined)
			}}
		>
			{resolveChildren(children, state, <PlayIcon />)}
		</Overlay>
	)
}

const Overlay = styled(
	"button",
	f.unresponsive(css`
		${buttonBase}
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		font-size: 64px;
	`),
)
