"use client"

import {
	type ComponentProps,
	ViewTransition as ReactViewTransition,
} from "react"
import { usePreloader } from "./link/usePreloader"
import { type CSSObject, createStyle } from "./styled/legacy"

type ClassProps = "default" | "enter" | "exit" | "share" | "update"

type TransitionProps = {
	[key in ClassProps]?: CSSObject | "auto" | "none"
} & Omit<ComponentProps<typeof ReactViewTransition>, ClassProps>

const makeStyle = (style: CSSObject | "none" | "auto" | undefined) => {
	if (style === "none") return ["none"]
	if (style === "auto") return ["auto"]
	return style ? createStyle(style) : [style]
}

export function Transition({
	children,
	default: defaultStyle,
	enter,
	exit,
	share,
	update,
	...props
}: TransitionProps) {
	const { completed } = usePreloader()
	const [defaultClass, DefaultStyle] = makeStyle(defaultStyle)
	const [enterClass, EnterStyle] = makeStyle(enter)
	const [exitClass, ExitStyle] = makeStyle(exit)
	const [shareClass, ShareStyle] = makeStyle(share)
	const [updateClass, UpdateStyle] = makeStyle(update)

	const viewTransitionProps = {
		...props,
		default: completed ? defaultClass : "none",
		enter: completed ? enterClass : "none",
		exit: completed ? exitClass : "none",
		share: completed ? shareClass : "none",
		update: completed ? updateClass : "none",
	}

	return (
		<>
			<ReactViewTransition {...viewTransitionProps}>
				{children}
			</ReactViewTransition>
			{DefaultStyle && <DefaultStyle />}
			{EnterStyle && <EnterStyle />}
			{ExitStyle && <ExitStyle />}
			{ShareStyle && <ShareStyle />}
			{UpdateStyle && <UpdateStyle />}
		</>
	)
}
