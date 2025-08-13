"use client"

import {
	unstable_ViewTransition as ReactViewTransition,
	type ComponentProps,
} from "react"
import { usePreloader } from "./link/usePreloader"
import { createStyle, type CSSObject } from "./styled"

type ClassProps = "default" | "enter" | "exit" | "share" | "update"

type TransitionProps = {
	[key in ClassProps]?: CSSObject | "auto" | "none"
} & Omit<ComponentProps<typeof ReactViewTransition>, ClassProps>

const makeStyle = (style: CSSObject | "none" | "auto") => {
	if (style === "none") return ["none"]
	if (style === "auto") return ["auto"]
	return createStyle(style)
}

export function Transition({
	children,
	default: defaultStyle = "auto",
	enter = "auto",
	exit = "auto",
	share = "auto",
	update = "auto",
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
