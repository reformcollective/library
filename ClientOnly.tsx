"use client"

import { use } from "react"
import { ScreenContext } from "./ScreenContext"

export default function ClientOnly({
	children,
}: {
	children: React.ReactNode
}) {
	const { screenContextReady } = use(ScreenContext)

	if (!screenContextReady) return null

	return <>{children}</>
}

export const useClientOnly = <T, F = undefined>(
	value: T,
	fallbackValue?: F,
) => {
	const { screenContextReady } = use(ScreenContext)

	if (!screenContextReady) return fallbackValue

	return value
}
