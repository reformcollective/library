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

const wrapStyle = (style: CSSObject) =>
	createStyle({
		"html::view-transition-group(&)": style,
	})

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
		? wrapStyle(defaultStyle)
		: []
	const [enterClass, EnterStyle] = enter ? wrapStyle(enter) : []
	const [exitClass, ExitStyle] = exit ? wrapStyle(exit) : []
	const [shareClass, ShareStyle] = share ? wrapStyle(share) : []
	const [updateClass, UpdateStyle] = update ? wrapStyle(update) : []

	if (completed) {
		return (
			<>
				<ReactViewTransition
					{...props}
					default={defaultClass}
					enter={enterClass}
					exit={exitClass}
					share={shareClass}
					update={updateClass}
				>
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
