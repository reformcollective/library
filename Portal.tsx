"use client"

import { Suspense } from "react"
import { createPortal } from "react-dom"
import { isBrowser } from "./deviceDetection"

export default function Portal({ children }: { children: React.ReactNode }) {
	if (isBrowser)
		return <Suspense>{createPortal(children, document.body)}</Suspense>
	return <Suspense />
}
