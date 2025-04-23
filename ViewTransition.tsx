"use client"

import {
	type ComponentProps,
	unstable_ViewTransition as ReactViewTransition,
} from "react"
import { usePreloader } from "./link/usePreloader"
import { createStyle, type CSSObject } from "./styled"

type ClassProps = "default" | "enter" | "exit" | "share" | "update"

type TransitionProps = Omit<
	ComponentProps<typeof ReactViewTransition>,
	ClassProps
> & {
	[key in ClassProps]?: CSSObject
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
	const [defaultClass, DefaultStyle] = defaultStyle
		? createStyle(defaultStyle)
		: []
	const [enterClass, EnterStyle] = enter ? createStyle(enter) : []
	const [exitClass, ExitStyle] = exit ? createStyle(exit) : []
	const [shareClass, ShareStyle] = share ? createStyle(share) : []
	const [updateClass, UpdateStyle] = update ? createStyle(update) : []

	if (completed) {
		const viewTransitionProps = {
			...props,
			default: defaultClass,
			enter: enterClass,
			exit: exitClass,
			share: shareClass,
			update: updateClass,
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

	return (
		<ReactViewTransition enter="none" exit="none" update="none" share="none">
			{children}
		</ReactViewTransition>
	)
}
