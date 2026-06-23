/**
 * A combined ref implementation using the callback ref cleanups feature.
 * This will work in React 19.
 */

import { type Ref, useCallback } from "react"

type OptionalRef<T> = Ref<T> | undefined

type Cleanup = (() => void) | undefined

function setRef<T>(ref: OptionalRef<T>, value: T): Cleanup {
	if (typeof ref === "function") {
		const cleanup = ref(value)

		if (typeof cleanup === "function") {
			return cleanup
		}
		return () => ref(null)
	}
	if (ref) {
		ref.current = value
		return () => {
			ref.current = null
		}
	}
}

export function useCombinedRefs<T>(externalRef: OptionalRef<T>, internalRef: OptionalRef<T>) {
	return useCallback(
		(value: T | null) => {
			const cleanups: Cleanup[] = []

			for (const ref of [externalRef, internalRef]) {
				const cleanup = setRef(ref, value)
				cleanups.push(cleanup)
			}

			return () => {
				for (const cleanup of cleanups) {
					cleanup?.()
				}
			}
		},
		[externalRef, internalRef],
	)
}
