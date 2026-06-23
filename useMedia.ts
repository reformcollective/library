import {
	desktopBreakpoint,
	mobileBreakpoint,
	tabletBreakpoint,
} from "app/styles/media"
import { use } from "react"

import { isBrowser } from "./deviceDetection"
import { ScreenContext } from "./ScreenContext"

/**
 * Pick a value by the current breakpoint in this order:
 * `fullWidth`, `desktop`, `tablet`, `mobile`.
 *
 * Use this inside a `ScreenProvider` when component logic needs to mirror the
 * same breakpoint split used by the styling system.
 */
export function useMedia<A, B, C, D>(fw: A, d: B, t: C, m: D) {
	const { desktop, fullWidth, mobile, tablet } = use(ScreenContext)

	if (fullWidth) return fw
	if (desktop) return d
	if (tablet) return t
	if (mobile) return m

	throw new Error("useMedia must be used within a ScreenProvider")
}

export function getMedia<A, B, C, D>(fw: A, d: B, t: C, m: D) {
	if (!isBrowser) return m
	if (window.innerWidth <= mobileBreakpoint) return m
	if (
		window.innerWidth > mobileBreakpoint &&
		window.innerWidth <= tabletBreakpoint
	)
		return t
	if (
		window.innerWidth > tabletBreakpoint &&
		window.innerWidth <= desktopBreakpoint
	)
		return d
	if (window.innerWidth > desktopBreakpoint) return fw

	return m
}
