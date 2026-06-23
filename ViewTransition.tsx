"use client"

import {
	type ComponentProps,
	ViewTransition as ReactViewTransition,
} from "react"
import type {} from "react/canary"

import { usePreloader } from "./link/usePreloader"

type ClassProps = "default" | "enter" | "exit" | "share" | "update"
type TransitionClass = "auto" | "none" | (string & Record<never, never>)

type TransitionProps = {
	[key in ClassProps]?: TransitionClass
} & Omit<ComponentProps<typeof ReactViewTransition>, ClassProps>

const mask = (completed: boolean) => (cls: string | undefined) =>
	completed ? cls : "none"

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
	const m = mask(completed)

	return (
		<ReactViewTransition
			{...props}
			default={m(defaultStyle)}
			enter={m(enter)}
			exit={m(exit)}
			share={m(share)}
			update={m(update)}
		>
			{children}
		</ReactViewTransition>
	)
}
