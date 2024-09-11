import { useCallback, useEffect, useState } from "react"

import TypedEventEmitter from "./TypedEventEmitter"

const events = new TypedEventEmitter<{
	sync: [key: string, newValue: string | null]
}>()

/**
 * useState that syncs with URL params
 * @param key the key to use in URL params
 * @returns null if the value is not set, undefined during hydration, or the value
 */
export const useParamState = (key: string) => {
	const [value, setValue] = useState<string | null>()

	// listen to changes on this tab
	useEffect(() => {
		// sync the state from the URL on mount
		const queryParams = new URLSearchParams(window.location.search)
		const initialValue = queryParams.get(key)
		setValue(initialValue)

		const onSync = (syncKey: string, newValue: string | null) => {
			if (syncKey === key) setValue(newValue)
		}

		// listen for changes on other instances of this hook
		events.addEventListener("sync", onSync)
		return () => {
			events.removeEventListener("sync", onSync)
		}
	}, [key])

	const externalSetValue = useCallback(
		(newValue: string | null) => {
			const queryParams = new URLSearchParams(window.location.search)

			// Set or update the specified key with the provided value
			if (!newValue) queryParams.delete(key)
			else queryParams.set(key, newValue)

			// Replace the current URL with the updated parameters
			const newUrl = `${window.location.pathname}?${queryParams.toString()}`
			window.history.replaceState({}, "", newUrl)

			events.dispatchEvent("sync", key, newValue)
		},
		[key],
	)

	return [value, externalSetValue] as const
}
