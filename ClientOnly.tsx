"use client"

import { use } from "react"
import { ScreenContext } from "./ScreenContext"

export default function ClientOnly({
	children,
}: {
	children: React.ReactNode
}) {
	const { initComplete } = use(ScreenContext)

	if (!initComplete) return null

	return <>{children}</>
}

export const useClientOnly = <T, F = undefined>(
	value: T,
	fallbackValue?: F,
) => {
	const { initComplete } = use(ScreenContext)

	if (!initComplete) return fallbackValue

	return value
}
