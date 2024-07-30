// horizontalLoop.d.ts

import type { gsap } from "gsap"
import type { Draggable } from "gsap/Draggable"

interface HorizontalLoopConfig {
	speed?: number
	paused?: boolean
	repeat?: number
	reversed?: boolean
	paddingRight?: number
	snap?: boolean | number | ((value: number) => number)
	draggable?: boolean
	center?: boolean
}

interface HorizontalLoopTimeline extends gsap.core.Timeline {
	next(vars?: gsap.TweenVars): gsap.core.Tween
	previous(vars?: gsap.TweenVars): gsap.core.Tween
	toIndex(index: number, vars?: gsap.TweenVars): gsap.core.Tween
	current(): number
	times: number[]
	draggable: Draggable
}

export function horizontalLoop(
	items: gsap.DOMTarget,
	config?: HorizontalLoopConfig,
): HorizontalLoopTimeline
