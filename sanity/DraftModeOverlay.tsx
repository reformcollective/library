"use client"

import { disableDraftMode } from "library/sanity/disableDraftMode"
import { siteURL } from "library/siteURL"
import { useRouter } from "next/navigation"
import {
	useDraftModeEnvironment,
	useIsPresentationTool,
} from "next-sanity/hooks"
import { VisualEditing } from "next-sanity/visual-editing"
import { type ComponentProps, useEffect, useTransition } from "react"
import { toast } from "sonner"

export default function DraftModeOverlay(
	props: ComponentProps<typeof VisualEditing>,
) {
	const isPresentationTool = useIsPresentationTool()
	const env = useDraftModeEnvironment()
	const router = useRouter()
	const [pending, startTransition] = useTransition()
	const isDeployedSite = !siteURL.includes("localhost")

	const showToast = isPresentationTool === false && env === "live"
	const showOverlays = isDeployedSite || isPresentationTool

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

	return showOverlays ? <VisualEditing {...props} /> : null
}
