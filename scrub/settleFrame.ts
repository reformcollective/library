/**
 * How the frame lands when an eased scrub catches up with the scroll position.
 * - `off`: always the eased frame, rounded.
 * - `snap`: within `threshold` frames of the scroll position, jump to it.
 * - `finish`: speeds the scrub tween up by `threshold` once scrolling has been idle for 100ms.
 * - `quantise`: ignore changes smaller than `threshold` frames, so a nearly-still scrub does not flicker between frames.
 */
export type SettleMode = "off" | "snap" | "finish" | "quantise"

export const settleFrame = (
	mode: SettleMode,
	threshold: number,
	eased: number,
	target: number,
	shown: number,
) => {
	if (mode === "snap" && Math.abs(eased - target) <= threshold) return Math.round(target)
	if (mode === "quantise" && Math.abs(eased - shown) < threshold) return shown
	return Math.round(eased)
}
