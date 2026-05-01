"use client"

import { disableDraftMode } from "library/sanity/disableDraftMode"
import { useRouter } from "next/navigation"
import { useIsPresentationTool } from "next-sanity/hooks"
import { useEffect, useTransition } from "react"
import { toast } from "sonner"

export function SanityPreviewStatusToast({
	isDraftMode,
}: {
	isDraftMode: boolean
}) {
	const isPresentationTool = useIsPresentationTool()
	const router = useRouter()
	const [pending, startTransition] = useTransition()

	useEffect(() => {
		if (isPresentationTool === undefined) return
		if (!isPresentationTool && !isDraftMode) return

		const toastId = toast(
			isDraftMode ? "Viewing Drafted Content" : "Viewing Published Content",
			{
				duration: Number.POSITIVE_INFINITY,
				action:
					isDraftMode && !isPresentationTool
						? {
								label: "Disable",
								onClick: async () => {
									await disableDraftMode()
									startTransition(() => {
										router.refresh()
									})
								},
							}
						: undefined,
			},
		)

		return () => {
			toast.dismiss(toastId)
		}
	}, [isDraftMode, isPresentationTool, router])

	useEffect(() => {
		if (pending) {
			const toastId = toast.loading("Disabling draft mode...")
			return () => {
				toast.dismiss(toastId)
			}
		}
	}, [pending])

	return null
}
