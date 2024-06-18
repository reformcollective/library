import { useContext } from "react"
import { ScreenContext } from "./ScreenContext"

export default function useMedia<A, B, C, D>(fw: A, d: B, t: C, m: D) {
	const { desktop, fullWidth, mobile, tablet } = useContext(ScreenContext)

	if (fullWidth) return fw
	if (desktop) return d
	if (tablet) return t
	if (mobile) return m

	throw new Error("useMedia must be used within a ScreenProvider")
}
