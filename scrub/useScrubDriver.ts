import { useLatest } from "ahooks"
import { gsap, type ScrollTrigger } from "gsap/all"
import { type RefObject, useEffect, useRef, useState } from "react"
import { useAnimation } from "../useAnimation"
import type { SequenceControl } from "./sequenceControl"
import { type SettleMode, settleFrame } from "./settleFrame"
import { springScrub } from "./springScrub"

/** what a scrubbed component gives the driver once it has frames to show */
export type ScrubTarget = {
	/** number of frames */
	length: number
	/** draws the frame at this index (0-based) */
	show: (index: number) => void
}

export type ScrubDriverOptions = {
	/** element whose scroll drives the frames */
	trigger: RefObject<HTMLElement | null>
	/** the element the animation is scoped to (the canvas) */
	scope: RefObject<Element | null>
	/** false builds nothing */
	enabled?: boolean
	start?: string
	end?: string
	/** seconds of lerp between scroll position and frame, as ScrollTrigger's scrub */
	scrub?: number | boolean
	settle?: SettleMode
	/** frames, for the settle mode */
	settleThreshold?: number
	/** with both set, a damped spring replaces the scrub tween and `scrub` and `settle` are ignored */
	springStiffness?: number
	springDamping?: number
	/** 0-based index scroll starts from: the top of the trigger shows this frame and the bottom the last */
	scrubFromIndex?: number
	/** remaps scroll progress (0-1) to the share of the frames shown (0-1). may be an inline function */
	progressCurve?: (progress: number) => number
	controlRef?: RefObject<SequenceControl>
}

export type ScrubDriver = {
	/**
	 * hands the driver the frames to show. draws the frame scroll calls for straight away.
	 * returns a function that detaches it again
	 */
	attach: (target: ScrubTarget) => () => void
	/** draws the current frame again, for a target whose frames arrive over time */
	redraw: () => void
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * Maps scroll to a frame index and tells a `ScrubTarget` to draw it. Shared by `ScrubbedVideo` and `ScrubbedImageSequence`.
 * The driver is rebuilt on resize and when its options change, but the attached target survives that, so
 * loading frames is never repeated because of it.
 */
export const useScrubDriver = ({
	trigger,
	scope,
	enabled = true,
	start = "top top",
	end = "bottom bottom",
	scrub = 1,
	settle = "off",
	settleThreshold = 2,
	springStiffness,
	springDamping,
	scrubFromIndex = 0,
	progressCurve,
	controlRef,
}: ScrubDriverOptions): ScrubDriver => {
	const targetRef = useRef<ScrubTarget | null>(null)
	const syncRef = useRef<(force: boolean) => void>(() => {})
	const curveRef = useLatest(progressCurve)

	// the trigger is usually an ancestor of the scoped element, and React attaches an ancestor's ref after this
	// component's layout effects, so on a client-side mount `trigger.current` is still null when useAnimation first
	// runs. reading it in a passive effect (which runs after refs are attached) and rebuilding once it is set covers that
	const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null)
	useEffect(() => {
		setTriggerEl(trigger.current)
	}, [trigger])

	useAnimation(
		() => {
			if (!enabled || !triggerEl) return

			let scrolled = 0
			let progress = 0
			let shown = 0
			let hasShown = false

			const lastIndex = () => Math.max((targetRef.current?.length ?? 1) - 1, 0)
			const indexAt = (share: number) => {
				const last = lastIndex()
				const from = clamp(scrubFromIndex, 0, last)
				return from + share * (last - from)
			}
			const curve = (value: number) => curveRef.current?.(value) ?? value

			const draw = (index: number, force = false) => {
				const target = targetRef.current
				if (!target) return
				const clamped = clamp(index, 0, lastIndex())
				if (hasShown && clamped === shown && !force) return
				hasShown = true
				shown = clamped
				target.show(clamped)
			}

			const sync = (force: boolean) => {
				const control = controlRef?.current
				draw(control?.held ? control.index : Math.round(indexAt(progress)), force)
			}
			syncRef.current = sync

			let stopSpring: (() => void) | undefined
			let scrubScrollTrigger: ScrollTrigger | undefined
			if (springStiffness !== undefined && springDamping !== undefined) {
				stopSpring = springScrub({
					trigger: triggerEl,
					start,
					end,
					stiffness: springStiffness,
					damping: springDamping,
					length: lastIndex,
					onValue: (position) => {
						progress = curve(position)
						scrolled = progress
						if (controlRef?.current.held) return
						draw(Math.round(indexAt(progress)))
					},
				})
			} else {
				const state = { frame: 0 }
				const IDLE_MS = 100
				let lastScroll = 0
				let scrubTween: gsap.core.Tween | undefined
				const rootTween = gsap.to(state, {
					frame: 1,
					ease: curve,
					scrollTrigger: {
						trigger: triggerEl,
						start,
						end,
						scrub,
						invalidateOnRefresh: true,
						onUpdate: (self) => {
							scrolled = curve(self.progress)
							lastScroll = performance.now()
							const tween = self.getTween()
							scrubTween = typeof tween?.timeScale === "function" ? tween : undefined
							scrubTween?.timeScale(1)
						},
						onRefresh: (self) => {
							scrolled = curve(self.progress)
						},
					},
					onUpdate: () => {
						progress = state.frame
						if (settle === "finish" && performance.now() - lastScroll > IDLE_MS) {
							scrubTween?.timeScale(settleThreshold)
						}
						if (controlRef?.current.held) return
						draw(settleFrame(settle, settleThreshold, indexAt(progress), indexAt(scrolled), shown))
					},
				})
				scrubScrollTrigger = rootTween.scrollTrigger
			}

			// a rebuild (resize, option change) starts with nothing drawn: seed from the scroll position and draw it
			if (scrubScrollTrigger) {
				scrolled = curve(scrubScrollTrigger.progress)
				progress = scrolled
				sync(false)
			}

			if (controlRef) {
				controlRef.current.draw = (index) => {
					const clamped = clamp(Math.round(index), 0, lastIndex())
					controlRef.current.index = clamped
					draw(clamped)
				}
				controlRef.current.release = () => {
					controlRef.current.held = false
					draw(Math.round(indexAt(scrolled)))
				}
			}

			return () => {
				stopSpring?.()
				if (controlRef) {
					controlRef.current.draw = () => {}
					controlRef.current.release = () => {}
				}
				syncRef.current = () => {}
			}
		},
		[
			triggerEl,
			enabled,
			start,
			end,
			scrub,
			settle,
			settleThreshold,
			springStiffness,
			springDamping,
			scrubFromIndex,
			controlRef,
		],
		{ scope, recreateOnResize: true },
	)

	const [handle] = useState<ScrubDriver>(() => ({
		attach: (target) => {
			targetRef.current = target
			syncRef.current(true)
			return () => {
				if (targetRef.current === target) targetRef.current = null
			}
		},
		redraw: () => syncRef.current(true),
	}))

	return handle
}
