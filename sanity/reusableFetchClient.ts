"use client"

import { usePathname } from "next/navigation"
import { isCorsOriginError } from "next-sanity/live"
import { useEffect, useState } from "react"
import { studioUrl } from "sanity/lib/api"
import { toast } from "sonner"

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
	const [isStudio, setIsStudio] = useState(true) // default to true during SSR
	const pathname = usePathname()

	useEffect(() => {
		setIsStudio(pathname.startsWith(studioUrl))
	}, [pathname])

	return isStudio ? null : children
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
