"use client"

import { Suspense } from "react"
import { createPortal } from "react-dom"
import ClientOnly from "./ClientOnly"
import { isBrowser } from "./deviceDetection"

export default function Portal({ children }: { children: React.ReactNode }) {
	return (
		<ClientOnly>
			<Suspense>{isBrowser && createPortal(children, document.body)}</Suspense>
		</ClientOnly>
	)
}
