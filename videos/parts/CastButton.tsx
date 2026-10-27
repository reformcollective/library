"use client"

import { f, styled } from "library/styled"
import CastIcon from "./icons/cast.inline.svg"
import { buttonBase } from "./styles.css"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

export function CastButton({
	label,
	alwaysShow,
	children,
	onClick,
	...rest
}: PartProps<"button">) {
	const { state, controller, support, visible, text } = usePart(["remotePlayback"], alwaysShow)
	if (!visible) return null

	return (
		<Button
			type="button"
			aria-label={label ?? text("cast")}
			data-support={support}
			{...rest}
			onClick={(event) => {
				onClick?.(event)
				if (event.defaultPrevented) return
				void controller.promptRemotePlayback().catch(() => undefined)
			}}
		>
			{resolveChildren(children, state, <CastIcon />)}
		</Button>
	)
}

const Button = styled("button", [f.unresponsive(buttonBase)])
