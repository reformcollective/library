"use client"

import { useIsPresentationTool } from "next-sanity/hooks"
import { VisualEditing } from "next-sanity/visual-editing"
import type { ComponentProps } from "react"

export function SanityVisualEditingOverlay({
	isDraftMode,
	...props
}: ComponentProps<typeof VisualEditing> & {
	isDraftMode: boolean
}) {
	const isPresentationTool = useIsPresentationTool()

	if (!isDraftMode || isPresentationTool !== true) return null

	return <VisualEditing {...props} />
}
