import type { MuxDataOptions } from "library/videos/types"

export function isGpcEnabled(): boolean {
	if (typeof navigator === "undefined") return false
	return Reflect.get(navigator, "globalPrivacyControl") === true
}

export function isTrackingAllowed(canTrack?: () => boolean): boolean {
	if (isGpcEnabled()) return false
	if (!canTrack) return true
	try {
		return canTrack() !== false
	} catch {
		return false
	}
}

/**
 * Decision O1: Mux Data is on by default and forced off (false) when canTrack() is false or GPC is set.
 * The adapter maps false to disable-tracking and disable-cookies.
 */
export function resolveMuxData(
	muxData: boolean | MuxDataOptions | undefined,
	canTrack?: () => boolean,
): boolean | MuxDataOptions {
	if (muxData === false) return false
	if (!isTrackingAllowed(canTrack)) return false
	if (muxData === undefined) return true
	return muxData
}
