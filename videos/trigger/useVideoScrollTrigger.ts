"use client"

import { ScrollTrigger } from "gsap/all"
import { useAnimation } from "library/useAnimation"
import type { UniversalVideoHandle } from "library/videos/types"

export interface VideoScrollTriggerOptions {
	/** The video handle, from the `ref` of a `UniversalVideo`. Nothing is created while null. */
	handle: UniversalVideoHandle | null
	/** Element whose scroll position starts the playback. Nothing is created while null. */
	trigger: Element | null
	/** ScrollTrigger `start`. Default "top bottom". */
	start?: string | number
	/** ScrollTrigger `end`. Default "bottom top". */
	end?: string | number
	/** Element whose position defines `end`, instead of `trigger`. */
	endTrigger?: Element | null
	/** Pause when the range is left. Default true. */
	pauseWhenOut?: boolean
	/** Play on the first enter only, then stop listening. Default false. */
	once?: boolean
	markers?: boolean
}

/**
 * Plays and pauses a `UniversalVideo` by scroll position, for videos an IntersectionObserver cannot judge (sticky or pinned sections that cover the video).
 * While attached it owns the trigger: the video's built-in in-view trigger stays idle (no play, pause or `maxConcurrent` slot), so leave `trigger` at its default. It resumes when the hook is removed.
 * Calls the same path as the built-in trigger, so a manual play or pause steps it aside until `releaseManualControl()`.
 * Pauses the video on creation when it starts out of range.
 * Does not use the `maxConcurrent` limiter.
 * ```tsx
 * const [handle, setHandle] = useState<UniversalVideoHandle | null>(null)
 * const [cover, setCover] = useState<HTMLElement | null>(null)
 * useVideoScrollTrigger({ handle, trigger: cover, start: "bottom 45%" })
 * <UniversalVideo ref={setHandle} />
 * ```
 */
export function useVideoScrollTrigger({
	handle,
	trigger,
	start = "top bottom",
	end = "bottom top",
	endTrigger,
	pauseWhenOut = true,
	once = false,
	markers = false,
}: VideoScrollTriggerOptions) {
	useAnimation(() => {
		if (!handle || !trigger) return
		const release = handle.claimTrigger()
		const instance = ScrollTrigger.create({
			trigger,
			start,
			end,
			endTrigger: endTrigger ?? undefined,
			markers,
			onEnter: () => {
				handle.playFromTrigger()
				if (once) instance.kill()
			},
			onEnterBack: () => handle.playFromTrigger(),
			onLeave: () => {
				if (pauseWhenOut) handle.pauseFromTrigger()
			},
			onLeaveBack: () => {
				if (pauseWhenOut) handle.pauseFromTrigger()
			},
		})
		if (!instance.isActive && pauseWhenOut) handle.pauseFromTrigger()
		return () => {
			instance.kill()
			release()
		}
	}, [handle, trigger, start, end, endTrigger, pauseWhenOut, once, markers])
}
