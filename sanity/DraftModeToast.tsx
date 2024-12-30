"use client"

import {
	useDraftModeEnvironment,
	useIsPresentationTool,
} from "next-sanity/hooks"
import { useRouter } from "next/navigation"
import { useEffect, useTransition } from "react"
import { toast } from "sonner"
import { disableDraftMode } from "./actions"

export default function DraftModeToast() {
	const isPresentationTool = useIsPresentationTool()
	const env = useDraftModeEnvironment()
	const router = useRouter()
	const [pending, startTransition] = useTransition()

	useEffect(() => {
		if (isPresentationTool === false && env === "live") {
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
	}, [router, isPresentationTool, env])

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
