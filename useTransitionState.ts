import { startTransition, useState } from "react"

export const useTransitionState = ((...init) => {
	const [value, setValue] = useState(...init)
	return [value, (...p) => startTransition(() => setValue(...p))]
}) as typeof useState
