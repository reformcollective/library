// horizontalLoop.d.ts

import type { gsap } from "gsap"

interface HorizontalLoopConfig {
	speed?: number
	paused?: boolean
	repeat?: number
	reversed?: boolean
	paddingRight?: number
	snap?: boolean | number | ((value: number) => number)
	draggable?: boolean
	center?: boolean
	[key: string]: any // Allow any additional properties
}

interface HorizontalLoopTimeline extends gsap.core.Timeline {
	next(vars?: Record<string, any>): gsap.core.Tween
	previous(vars?: Record<string, any>): gsap.core.Tween
	toIndex(index: number, vars?: Record<string, any>): gsap.core.Tween
	current(): number
	times: number[]
}

export function horizontalLoop(
	items: gsap.DOMTarget,
	config?: HorizontalLoopConfig,
): HorizontalLoopTimeline
