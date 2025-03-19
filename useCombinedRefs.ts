import { type Ref, useImperativeHandle, useRef } from "react"

function useCombinedRefs<T>(externalRef?: Ref<T>) {
	const internalRef = useRef<T>(null)

	useImperativeHandle<T | null, T | null>(
		externalRef,
		() => internalRef.current,
	)

	return internalRef
}

export default useCombinedRefs
