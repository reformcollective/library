/**
 * Imperative handoff between scroll and something else (a clock, an intro timeline) that drives the frames.
 * Pass the same object as `controlRef` to a scrubbed component, set `held = true` while you drive it with `draw`,
 * then call `release()` to hand the frame back to the scroll position.
 * Create one with `createSequenceControl` and keep it stable (a module constant or a ref).
 */
export type SequenceControl = {
	/** while true, scroll does not draw frames */
	held: boolean
	/** the frame index to show when scroll takes over, kept up to date by `draw` */
	index: number
	/** draws a frame index (clamped to the clip) and remembers it as `index` */
	draw: (index: number) => void
	/** clears `held` and draws the frame the scroll position calls for */
	release: () => void
}

export const createSequenceControl = (): SequenceControl => ({
	held: false,
	index: 0,
	draw: () => {},
	release: () => {},
})
