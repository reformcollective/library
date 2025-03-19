"use client"

import { use } from "react"
import { ScreenContext } from "./ScreenContext"

export default function ClientOnly({
	children,
}: {
	children: React.ReactNode
}) {
	const { hydrateUtilities } = use(ScreenContext)

	if (!hydrateUtilities) return null

	return <>{children}</>
}

export const useClientOnly = <T, F = undefined>(
	value: T,
	fallbackValue?: F,
) => {
	const { hydrateUtilities } = use(ScreenContext)

	if (!hydrateUtilities) return fallbackValue

	return value
}
