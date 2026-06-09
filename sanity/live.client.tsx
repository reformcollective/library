"use client"

import { useInterval } from "ahooks"
import { browserData } from "library/deviceDetection"
import TypedEventEmitter from "library/TypedEventEmitter"
import { useHMR } from "library/useHMR"
import { usePathname, useRouter } from "next/navigation"
import { stegaClean } from "next-sanity"
import { useVisualEditingEnvironment } from "next-sanity/hooks"
import { VisualEditing } from "next-sanity/visual-editing"
import type { ComponentProps, ReactNode } from "react"
import { useEffect, useState, useTransition } from "react"
import { studioUrl } from "sanity/lib/api"
import { Toaster, toast } from "sonner"
import { disableDraftMode } from "./disableDraftMode"

const sanityLiveRefreshEvents = new TypedEventEmitter<{ refresh: [] }>()

export async function notifySanityLiveRefreshAction() {
	sanityLiveRefreshEvents.dispatchEvent("refresh")
	return "refresh" as const
}

const isPresentationEnvironment = (
	environment: ReturnType<typeof useVisualEditingEnvironment>,
) =>
	environment === "presentation-iframe" || environment === "presentation-window"

export function SanityRuntime({
	children,
	isDraftMode,
}: {
	children?: ReactNode
	isDraftMode: boolean
}) {
	const pathname = usePathname()
	const isStudio = pathname.startsWith(studioUrl)
	const environment = useVisualEditingEnvironment()
	const isPresentation = isPresentationEnvironment(environment)

	if (isStudio) return null

	return (
		<>
			<Toaster />
			<SanityRuntimeRefresh showRefreshToast={isDraftMode} />
			{children}
			<SanityPreviewStatusToast
				isDraftMode={isDraftMode}
				isPresentation={isPresentation}
			/>
			<SanityVisualEditingOverlay isDraftMode={isDraftMode} />
			{isDraftMode && <FirefoxFix />}
		</>
	)
}

export function SanityRuntimeRefresh({
	showRefreshToast,
}: {
	showRefreshToast: boolean
}) {
	const router = useRouter()
	const [pending, startTransition] = useTransition()
	const [, setSanityLiveRefreshSignal] = useState(0)

	useEffect(() => {
		const eventSource = new EventSource("/api/live")

		eventSource.onmessage = (e) => {
			const event = JSON.parse(e.data)
			if (
				event &&
				typeof event === "object" &&
				"type" in event &&
				event.type === "refresh"
			) {
				startTransition(() => {
					router.refresh()
				})
			}
		}

		return () => eventSource.close()
	}, [router])

	useEffect(() => {
		const handleSanityLiveRefresh = () => {
			startTransition(() => {
				setSanityLiveRefreshSignal((signal) => signal + 1)
			})
		}

		sanityLiveRefreshEvents.addEventListener("refresh", handleSanityLiveRefresh)
		return () => {
			sanityLiveRefreshEvents.removeEventListener(
				"refresh",
				handleSanityLiveRefresh,
			)
		}
	}, [])

	useEffect(() => {
		if (!pending || !showRefreshToast) return

		const toastId = toast.loading("Refreshing content...")
		return () => {
			toast.dismiss(toastId)
		}
	}, [pending, showRefreshToast])

	return null
}

export function SanityPreviewStatusToast({
	isDraftMode,
	isPresentation,
}: {
	isDraftMode: boolean
	isPresentation: boolean
}) {
	const router = useRouter()
	const [pending, startTransition] = useTransition()

	useEffect(() => {
		if (!isPresentation && !isDraftMode) return

		const toastId = toast(
			isDraftMode ? "Viewing Drafted Content" : "Viewing Published Content",
			{
				duration: !isDraftMode && isPresentation ? Infinity : undefined,
				action:
					isDraftMode && !isPresentation
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
	}, [isDraftMode, isPresentation, router])

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
	if (!isDraftMode) return null

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
