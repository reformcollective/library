import { useEffect, useRef } from "react"
import { StyleSheetManager } from "styled-components"

export default function StyledManager({
	children,
}: {
	children: React.ReactNode
}) {
	const isValidConfig = useRef(false)

	useEffect(() => {
		const timeout = setTimeout(() => {
			if (!isValidConfig.current)
				console.warn(
					"StyledManager isn't doing anything! Is it set up correctly? It must go in wrapPageElement, not wrapRootElement.",
				)
		}, 1000)
		return () => clearTimeout(timeout)
	}, [])

	return (
		<StyleSheetManager
			enableVendorPrefixes
			shouldForwardProp={() => {
				isValidConfig.current = true
				return true
			}}
		>
			{children}
		</StyleSheetManager>
	)
}
