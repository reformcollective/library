"use client"

import { isBrowser } from "library/deviceDetection"
import { isCorsOriginError } from "next-sanity"
import { useState } from "react"
import { toast } from "sonner"
import { studioUrl } from "../../../sanity/lib/api"

/**
 * if sanity live is initialized in the studio, the page
 * might reload unexpectedly, so we delay the rendering
 * of the studio until we're sure it's not in the studio
 */
export default function LiveWrapper({
	children,
}: {
	children: React.ReactNode
}) {
	const [show, setShow] = useState(false)

	const newShow = isBrowser && window.location.pathname.startsWith(studioUrl)
	if (newShow !== show) setShow(newShow)

	return show ? null : children
}

export function handleError(error: unknown) {
	if (isCorsOriginError(error)) {
		// If the error is a CORS origin error, let's display that specific error.
		const { addOriginUrl } = error
		toast.error(`Sanity Live couldn't connect`, {
			description: "Your origin is blocked by CORS policy",
			duration: Number.POSITIVE_INFINITY,
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
			duration: Number.POSITIVE_INFINITY,
		})
	} else {
		console.error(error)
		toast.error("Unknown error", {
			description: "Check the console for more details",
			duration: Number.POSITIVE_INFINITY,
		})
	}
}
