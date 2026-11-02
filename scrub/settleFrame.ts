/**
 * How the frame lands when an eased scrub catches up with scroll.
 * - `off`: the eased frame, rounded.
 * - `snap`: jump to the scroll frame when within `threshold` frames.
 * - `finish`: speed the tween up by `threshold` after 100ms idle.
 * - `quantise`: ignore changes under `threshold` frames.
 */
export type SettleMode = "off" | "snap" | "finish" | "quantise"

export const settleFrame = (
	mode: SettleMode,
	threshold: number,
	eased: number,
	target: number,
	shown: number,
) => {
	if (mode === "snap" && Math.abs(eased - target) <= threshold)
		return Math.round(target)
	if (mode === "quantise" && Math.abs(eased - shown) < threshold) return shown
	return Math.round(eased)
}
