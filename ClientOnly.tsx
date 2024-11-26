"use client"

import { startTransition, useEffect, useState } from "react"

import { isBrowser } from "./deviceDetection"

export default function ClientOnly({
	children,
}: {
	children: React.ReactNode
}) {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		startTransition(() => {
			setMounted(isBrowser)
		})
	}, [])

	if (!mounted) return null

	return <>{children}</>
}

export const useClientOnly = <T, F = undefined>(
	value: T,
	fallbackValue?: F,
) => {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		startTransition(() => {
			setMounted(isBrowser)
		})
	}, [])

	if (!mounted) return fallbackValue

	return value
}
