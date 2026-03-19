"use client"

import { disableDraftMode } from "library/sanity/disableDraftMode"
import { useRouter } from "next/navigation"
import { useIsPresentationTool } from "next-sanity/hooks"
import { VisualEditing } from "next-sanity/visual-editing"
import { type ComponentProps, useEffect, useTransition } from "react"
import { toast } from "sonner"

export default function DraftModeOverlay(
	props: ComponentProps<typeof VisualEditing>,
) {
	const isPresentationTool = useIsPresentationTool()
	const router = useRouter()
	const [pending, startTransition] = useTransition()

	const showToast = isPresentationTool === false

	useEffect(() => {
		if (showToast) {
			/**
			 * We delay the toast in case we're inside Presentation Tool
			 */
			const toastId = toast("Previewing Drafted Content", {
				duration: 10_000,
				action: {
					label: "Disable",
					onClick: async () => {
						await disableDraftMode()
						startTransition(() => {
							router.refresh()
						})
					},
				},
			})

			return () => {
				toast.dismiss(toastId)
			}
		}
	}, [router, showToast])

	useEffect(() => {
		if (pending) {
			const toastId = toast.loading("Disabling draft mode...")
			return () => {
				toast.dismiss(toastId)
			}
		}
	}, [pending])

	return <VisualEditing {...props} />
}
