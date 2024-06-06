import { useContext } from "react"
import { ScreenContext } from "./ScreenContext"

export default function useMedia<InputType>(
	fw: InputType,
	d: InputType,
	t: InputType,
	m: InputType,
) {
	const { desktop, fullWidth, mobile, tablet } = useContext(ScreenContext)

	if (fullWidth) return fw
	if (desktop) return d
	if (tablet) return t
	if (mobile) return m

	throw new Error("useMedia must be used within a ScreenProvider")
}
