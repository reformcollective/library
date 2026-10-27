export const DEFAULT_PROGRESS_THRESHOLDS = [10, 25, 50, 75]

const SEEK_JUMP_SECONDS = 2

export interface ProgressTracker {
	/** Returns thresholds newly crossed by natural playback, ascending. Seeks past a threshold mark it as passed without firing. */
	update: (currentTime: number, duration: number) => number[]
	reset: () => void
}

export function normalizeThresholds(thresholds: number[] | undefined): number[] {
	const source = thresholds ?? DEFAULT_PROGRESS_THRESHOLDS
	const valid = source.filter((value) => Number.isFinite(value) && value > 0 && value < 100)
	return [...new Set(valid)].sort((a, b) => a - b)
}

export function getPercent(currentTime: number, duration: number): number {
	if (!Number.isFinite(duration) || duration <= 0) return 0
	const percent = (currentTime / duration) * 100
	return Math.min(100, Math.max(0, Math.round(percent)))
}

export function createProgressTracker(thresholds?: number[]): ProgressTracker {
	const list = normalizeThresholds(thresholds)
	const done = new Set<number>()
	let lastTime: number | null = null

	return {
		update(currentTime, duration) {
			if (!Number.isFinite(duration) || duration <= 0) return []
			const previous = lastTime
			lastTime = currentTime
			const seeked = previous !== null && Math.abs(currentTime - previous) > SEEK_JUMP_SECONDS
			const percent = (currentTime / duration) * 100
			const crossed = list.filter((value) => !done.has(value) && percent >= value)
			for (const value of crossed) done.add(value)
			return seeked ? [] : crossed
		},
		reset() {
			done.clear()
			lastTime = null
		},
	}
}
