import {
	desktopBreakpoint as desktop,
	mobileBreakpoint as mobile,
	tabletBreakpoint as tablet,
} from "styles/media"

export default function getMedia<A, B, C, D>(fw: A, d: B, t: C, m: D) {
	if (typeof window !== "undefined") {
		if (window.innerWidth > desktop) {
			return fw
		}
		if (window.innerWidth > tablet) {
			return d
		}
		if (window.innerWidth > mobile) {
			return t
		}
		if (window.innerWidth <= mobile) {
			return m
		}
	}

	return d
}
