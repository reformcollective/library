"use client"

import {
	type ComponentProps,
	ViewTransition as ReactViewTransition,
} from "react"
import { usePreloader } from "./link/usePreloader"

type ClassProps = "default" | "enter" | "exit" | "share" | "update"

type TransitionProps = {
	[key in ClassProps]?: string | "auto" | "none"
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
	console.log({completed})

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
