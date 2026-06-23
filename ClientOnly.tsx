"use client"

import { use } from "react"

import { ScreenContext } from "./ScreenContext"

export default function ClientOnly({
	children,
}: {
	children: React.ReactNode
}) {
	const { shouldHydrateUtilities } = use(ScreenContext)

	if (!shouldHydrateUtilities) return null

	return <>{children}</>
}

export const useClientOnly = <T, F = undefined>(
	value: T,
	fallbackValue?: F,
) => {
	const { shouldHydrateUtilities } = use(ScreenContext)

	if (!shouldHydrateUtilities) return fallbackValue

	return value
}
