import { useRef, useCallback, type Ref, type RefObject, useMemo } from "react"

function useCombinedRefs<T>(externalRef?: Ref<T>): RefObject<T | null> {
	const internalRef = useRef<T>(null)
	const combinedRef = useRef<T>(null)

	const setRefs = useCallback(
		(node: T | null) => {
			internalRef.current = node

			if (typeof externalRef === "function") {
				externalRef(node)
			} else if (externalRef) {
				externalRef.current = node
			}

			combinedRef.current = node
		},
		[externalRef],
	)

	return useMemo(
		() => ({
			get current() {
				return combinedRef.current
			},
			set current(node: T | null) {
				setRefs(node)
			},
		}),
		[setRefs],
	)
}

export default useCombinedRefs
