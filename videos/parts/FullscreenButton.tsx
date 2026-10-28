"use client"

import { f, styled } from "library/styled"
import FullscreenIcon from "./icons/fullscreen.inline.svg"
import FullscreenExitIcon from "./icons/fullscreen-exit.inline.svg"
import { buttonBase } from "./styles.css"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

export function FullscreenButton({
	label,
	alwaysShow,
	children,
	onClick,
	...rest
}: PartProps<"button">) {
	const { state, controller, support, visible, text } = usePart(
		["fullscreen"],
		alwaysShow,
	)
	if (!visible) return null

	const name =
		label ?? (state.fullscreen ? text("exitFullscreen") : text("fullscreen"))

	return (
		<Button
			type="button"
			aria-label={name}
			data-state={state.fullscreen ? "fullscreen" : "windowed"}
			data-support={support}
			{...rest}
			onClick={(event) => {
				onClick?.(event)
				if (event.defaultPrevented) return
				const request = state.fullscreen
					? controller.exitFullscreen()
					: controller.requestFullscreen()
				void request.catch(() => undefined)
			}}
		>
			{resolveChildren(
				children,
				state,
				state.fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />,
			)}
		</Button>
	)
}

const Button = styled("button", [f.unresponsive(buttonBase)])
