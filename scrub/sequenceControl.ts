/** Hands the frame between scroll and something else driving it. Pass as `controlRef` and keep it stable. */
export type SequenceControl = {
	/** while true, scroll does not draw */
	held: boolean
	/** frame scroll takes over from, kept up to date by `draw` */
	index: number
	/** draws a frame, clamped to the clip */
	draw: (index: number) => void
	/** clears `held` and redraws from scroll */
	release: () => void
}

export const createSequenceControl = (): SequenceControl => ({
	held: false,
	index: 0,
	draw: () => {},
	release: () => {},
})
