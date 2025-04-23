"use client"

import {
	useDraftModeEnvironment,
	useIsPresentationTool,
} from "next-sanity/hooks"
import { useRouter } from "next/navigation"
import { useEffect, useTransition, type ComponentProps } from "react"
import { toast } from "sonner"
import { disableDraftMode } from "./actions"
import { VisualEditing } from "next-sanity"
import { siteURL } from "library/siteURL"

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
				duration: Number.POSITIVE_INFINITY,
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
