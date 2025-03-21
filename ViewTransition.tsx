"use client"

import {
	type ComponentProps,
	unstable_ViewTransition as ReactViewTransition,
} from "react"
import { usePreloader } from "./link/usePreloader"

export function Transition({
	children,
}: ComponentProps<typeof ReactViewTransition>) {
	const { completed } = usePreloader()

	if (completed) return <ReactViewTransition>{children}</ReactViewTransition>
	return <>{children}</>
}
