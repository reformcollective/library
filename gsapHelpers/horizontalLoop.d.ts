// horizontalLoop.d.ts

import type { gsap, Draggable } from "gsap/all"

interface HorizontalLoopConfig {
	speed?: number
	paused?: boolean
	repeat?: number
	reversed?: boolean
	paddingRight?: number
	snap?: boolean | number | ((value: number) => number)
	draggable?: boolean
	/** how quickly a released drag slows down. lower coasts further. default 1000 */
	throwResistance?: number
	/** shortest coast after a release, seconds. by default a slow release can stop almost at once */
	minThrowDuration?: number
	/** longest coast after a release, seconds. default 2 */
	maxThrowDuration?: number
	/** furthest a release can coast, px. default 1000 */
	maxThrowDistance?: number
	center?: boolean | gsap.DOMTarget
	/** Pixel offset from the container's left edge where items snap. Ignored when center is true. */
	snapOffset?: number
	onChange?: (items: unknown, index: number) => void
	/**
	 * When false, the helper will not attach a window resize listener.
	 * Use this if the caller is responsible for tearing down and recreating
	 * the loop on width changes.
	 */
	manageResize?: boolean
}

interface HorizontalLoopTimeline extends gsap.core.Timeline {
	next(vars?: gsap.TweenVars): gsap.core.Tween
	previous(vars?: gsap.TweenVars): gsap.core.Tween
	toIndex(index: number, vars?: gsap.TweenVars): gsap.core.Tween
	current(): number
	scrollBy(count: number): void
	times: number[]
	draggable: Draggable
	next(vars?: gsap.TweenVars): gsap.core.Tween
	previous(vars?: gsap.TweenVars): gsap.core.Tween
}

export function horizontalLoop(
	items: gsap.DOMTarget,
	config?: HorizontalLoopConfig,
): HorizontalLoopTimeline
