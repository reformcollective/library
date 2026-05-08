"use client"

import type { LiveEvent } from "@sanity/client"
import { useInterval } from "ahooks"
import { browserData } from "library/deviceDetection"
import { useHMR } from "library/useHMR"
import { usePathname, useRouter } from "next/navigation"
import { stegaClean } from "next-sanity"
import { useIsPresentationTool } from "next-sanity/hooks"
import { isCorsOriginError } from "next-sanity/live"
import { revalidateSyncTags } from "next-sanity/live/server-actions"
import { VisualEditing } from "next-sanity/visual-editing"
import type { ComponentProps } from "react"
import { useEffect, useState, useTransition } from "react"
import { studioUrl } from "sanity/lib/api"
import { toast } from "sonner"
import { disableDraftMode } from "./disableDraftMode"

/**
 * if sanity live is initialized in the studio, the page
 * might reload unexpectedly, so we delay the rendering
 * of the studio until we're sure it's not in the studio
 */
export function LiveWrapper({ children }: { children: React.ReactNode }) {
	const [isStudio, setIsStudio] = useState(true) // default to true during SSR
	const pathname = usePathname()

	useEffect(() => {
		setIsStudio(pathname.startsWith(studioUrl))
	}, [pathname])

	return isStudio ? null : children
}

/**
 * a lightweight version of SanityLive
 *
 * - shares connections to sanity between clients
 * - works event without CORS configuration (although you should still configure it for the studio)
 */
export function SanityLiveProxy() {
	const router = useRouter()

	useEffect(() => {
		const eventSource = new EventSource("/api/live")

		eventSource.onmessage = (e) => {
			const event = JSON.parse(e.data) as LiveEvent
			if (event.type === "message") {
				revalidateSyncTags(event.tags)
			} else if (event.type === "restart" || event.type === "reconnect") {
				router.refresh()
			}
		}

		return () => eventSource.close()
	}, [router])

	return null
}

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

let hasWarned = false

// biome-ignore lint/suspicious/noMisleadingCharacterClass: directly copied from sanity
const zeroWidthChars = /[\u200B\u200C\u200D\uFEFF]/g

const checkZeroWidthChars = (startNode: Node = document.body) => {
	const walk = (node: Node) => {
		if (window.lenisInstance?.isScrolling) return

		if (node.nodeType === Node.TEXT_NODE) {
			const parent = node.parentElement
			const hasStega = zeroWidthChars.test(node.textContent ?? "")

			if (parent && hasStega) {
				const computedStyle = getComputedStyle(parent)
				const letterSpacing = parseFloat(computedStyle.letterSpacing)

				// remove the stega and replace the content
				if (letterSpacing !== 0) {
					const cleanContent = stegaClean(node.textContent ?? "")
					node.textContent = cleanContent

					if (!hasWarned) {
						hasWarned = true
						toast.info("Some draft mode features are disabled in Firefox")
					}
				}
			}
		} else {
			node.childNodes.forEach(walk)
		}
	}

	walk(startNode)
}

export const FirefoxFix = () => {
	useInterval(() => {
		if (browserData.isFireFox) checkZeroWidthChars()
	}, 1000)
	useHMR("afterRefresh", () => {
		if (browserData.isFireFox) {
			checkZeroWidthChars()
		}
	})

	return null
}

export function handleError(error: unknown) {
	if (isCorsOriginError(error)) {
		// If the error is a CORS origin error, let's display that specific error.
		const { addOriginUrl } = error
		toast.error(`Sanity Live couldn't connect`, {
			description: "Your origin is blocked by CORS policy",
			duration: 3000,
			dismissible: true,
			action: addOriginUrl
				? {
						label: "Manage",
						onClick: () => window.open(addOriginUrl.toString(), "_blank"),
					}
				: undefined,
		})
	} else if (error instanceof Error) {
		console.error(error)
		toast.error(error.name, {
			description: error.message,
			duration: 10_000,
		})
	} else {
		console.error(error)
		toast.error("Unknown error", {
			description: "Check the console for more details",
			duration: 10_000,
		})
	}
}
