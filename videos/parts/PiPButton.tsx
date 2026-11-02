"use client"

import { f, styled } from "library/styled"
import PipIcon from "./icons/pip.inline.svg"
import { buttonBase } from "./styles.css"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

export function PiPButton({
	label,
	alwaysShow,
	children,
	onClick,
	...rest
}: PartProps<"button">) {
	const { state, controller, support, visible, text } = usePart(
		["pip"],
		alwaysShow,
	)
	if (!visible) return null

	return (
		<Button
			type="button"
			aria-label={label ?? text("pictureInPicture")}
			data-support={support}
			{...rest}
			onClick={(event) => {
				onClick?.(event)
				if (event.defaultPrevented) return
				void controller.requestPictureInPicture().catch(() => undefined)
			}}
		>
			{resolveChildren(children, state, <PipIcon />)}
		</Button>
	)
}

const Button = styled("button", [f.unresponsive(buttonBase)])
