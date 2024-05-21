import type React from "react"
import { createContext, useEffect, useMemo, useState } from "react"

type FormOptions = "demo" | "contact" | null

export const ModalContext = createContext<{
	type: FormOptions
	setType: React.Dispatch<React.SetStateAction<FormOptions>>
}>({
	type: null,
	setType: () => false,
})

export default function ModalProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [type, setType] = useState<FormOptions>(null)

	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search)

		const contact = urlParams.get("contact-modal-open")
		const demo = urlParams.get("demo-modal-open")

		if (contact === "true") {
			setType("contact")
		} else if (demo === "true") {
			setType("demo")
		}
	}, [])

	const values = useMemo(
		() => ({
			type,
			setType,
		}),
		[type],
	)

	return (
		<ModalContext.Provider value={values}>{children}</ModalContext.Provider>
	)
}
