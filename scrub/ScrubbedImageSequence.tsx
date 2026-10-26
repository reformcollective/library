"use client"

import { useLatest } from "ahooks"
import { type RefObject, useRef } from "react"
import { useAnimation } from "../useAnimation"
import { ScrubCanvas } from "./ScrubCanvas"
import type { SequenceControl } from "./sequenceControl"
import type { SettleMode } from "./settleFrame"
import { useScrubDriver } from "./useScrubDriver"

/** first, last, then midpoints of ever smaller spans, so any prefix of the order covers the clip evenly */
const bisectionOrder = (count: number) => {
	const result: number[] = []
	const added = new Set<number>()

	const add = (i: number) => {
		if (added.has(i)) return
		added.add(i)
		result.push(i)
	}

	add(0)
	add(count - 1)

	const queue: [number, number][] = [[0, count - 1]]
	while (queue.length > 0) {
		const next = queue.shift()
		if (!next) break
		const [lo, hi] = next
		if (hi - lo <= 1) continue
		const mid = Math.floor((lo + hi) / 2)
		add(mid)
		queue.push([lo, mid], [mid, hi])
	}

	return result
}

const pad = (n: number, digits: number) => String(n).padStart(digits, "0")

/**
 * A numbered set of image frames scrubbed by scroll, drawn to a canvas. Needs no extra dependency.
 *
 * Scrubbing a `<video>`'s `currentTime` stops repainting on Safari once the tab has been in the background,
 * so the frames are separate images. They load in bisection order (first, last, midpoints...), so the whole
 * clip is scrubbable at a coarse resolution after only a few arrive, and the nearest loaded frame is drawn
 * until the exact one is in (no cross-fade).
 * Frames are drawn as `HTMLImageElement`s rather than `ImageBitmap`s on purpose: bitmaps hold decoded pixels
 * (about 2 MB each at 1080p), which adds up to hundreds of MB on a long clip and kills iOS tabs.
 */
export function ScrubbedImageSequence({
	basePath,
	digits = 4,
	firstFrame = 1,
	lastFrame,
	ext = "avif",
	scrubFrom,
	progressCurve,
	priority,
	controlRef,
	onPriorityLoaded,
	trigger,
	enabled = true,
	scrub,
	settle,
	settleThreshold,
	springStiffness,
	springDamping,
	start,
	end,
	fit = "cover",
	alt = "",
	onProgress,
	onReady,
	className,
}: {
	/** url prefix of the frames, up to the frame number */
	basePath: string
	/** zero-padded width of the frame number */
	digits?: number
	firstFrame?: number
	lastFrame: number
	/** file extension without the dot. default "avif" */
	ext?: string
	/**
	 * the frame number scroll starts from: the top of the trigger shows this frame, and the bottom
	 * shows `lastFrame`. defaults to `firstFrame`. the frames before it are for something else to
	 * play, by `controlRef`, so the sequence can open on a clock and hand over to scroll where it left off
	 */
	scrubFrom?: number
	/** maps the scroll's progress through the trigger (0 to 1) to the share of the frames shown: for a sequence that stops on a frame for part of the scroll */
	progressCurve?: (progress: number) => number
	/**
	 * frames to load first, in order, every `step` frames from `firstFrame` up to frame `to` and then
	 * `to` itself, before the rest in bisection order. for a clip that is played from its start
	 */
	priority?: { to: number; step: number }
	/** see `SequenceControl` */
	controlRef?: RefObject<SequenceControl>
	/** fires once every `priority` frame has loaded, or failed to */
	onPriorityLoaded?: () => void
	/** element whose scroll drives the sequence */
	trigger: RefObject<HTMLElement | null>
	/** false keeps every frame from loading, for a layout that is hidden at this size */
	enabled?: boolean
	/** seconds of lerp between scroll position and frame, as ScrollTrigger's scrub. default 1 */
	scrub?: number | boolean
	/** advanced: how the frame lands at the end of an eased scrub, see README. default "off" */
	settle?: SettleMode
	/** advanced: frames, for the settle mode. default 2 */
	settleThreshold?: number
	/** advanced: with both set, a damped spring replaces the scrub tween and `scrub` and `settle` are ignored */
	springStiffness?: number
	springDamping?: number
	/** default "top top" */
	start?: string
	/** default "bottom bottom" */
	end?: string
	/** how the frame fills the element, as object-fit */
	fit?: "cover" | "contain" | "fill"
	/** describes the animation for assistive tech; the canvas is aria-hidden when empty */
	alt?: string
	/** reports loaded (or failed) frame count so a caller can show load state */
	onProgress?: (loaded: number, total: number) => void
	/** fires once the first frame is on screen */
	onReady?: () => void
	/** so the sequence can be restyled or targeted by a parent styled component */
	className?: string
}) {
	const canvas = useRef<HTMLCanvasElement>(null)
	const onReadyLatest = useLatest(onReady)
	const onProgressLatest = useLatest(onProgress)
	const onPriorityLoadedLatest = useLatest(onPriorityLoaded)

	const frameCount = lastFrame - firstFrame + 1
	const priorityTo = priority?.to
	const priorityStep = priority?.step

	const driver = useScrubDriver({
		trigger,
		scope: canvas,
		enabled,
		start,
		end,
		scrub,
		settle,
		settleThreshold,
		springStiffness,
		springDamping,
		scrubFromIndex: (scrubFrom ?? firstFrame) - firstFrame,
		progressCurve,
		controlRef,
	})

	useAnimation(
		() => {
			const el = canvas.current
			if (!el || !enabled) return

			const frames: (HTMLImageElement | null)[] = Array.from({ length: frameCount }, () => null)
			const ctx = el.getContext("2d", { alpha: false })
			let sized = false
			let loaded = 0
			let ready = false
			let painted: HTMLImageElement | null = null

			const nearestLoaded = (index: number) => {
				const exact = frames[index]
				if (exact) return exact
				for (let offset = 1; offset < frameCount; offset++) {
					const before = index - offset >= 0 ? frames[index - offset] : null
					if (before) return before
					const after = index + offset < frameCount ? frames[index + offset] : null
					if (after) return after
				}
				return null
			}

			const show = (index: number) => {
				const frame = nearestLoaded(index)
				if (!frame || !ctx || frame === painted) return
				painted = frame
				ctx.drawImage(frame, 0, 0, el.width, el.height)

				if (!ready) {
					ready = true
					onReadyLatest.current?.()
				}
			}
			const detach = driver.attach({ length: frameCount, show })

			const order: number[] = []
			const priorityIndexes = new Set<number>()
			if (priorityTo !== undefined && priorityStep !== undefined) {
				const last = Math.min(Math.max(priorityTo - firstFrame, 0), frameCount - 1)
				const step = Math.max(Math.floor(priorityStep), 1)
				for (let i = 0; i < last; i += step) priorityIndexes.add(i)
				priorityIndexes.add(last)
				order.push(...priorityIndexes)
			}
			const queued = new Set(order)
			for (const i of bisectionOrder(frameCount)) {
				if (!queued.has(i)) order.push(i)
			}
			let priorityWaiting = priorityIndexes.size
			const priorityDone = (index: number) => {
				if (!priorityIndexes.has(index)) return
				priorityWaiting -= 1
				if (priorityWaiting === 0) onPriorityLoadedLatest.current?.()
			}
			if (priorityWaiting === 0 && priorityTo !== undefined) onPriorityLoadedLatest.current?.()

			const images: HTMLImageElement[] = []
			for (const i of order) {
				const img = new Image()
				img.decoding = "async"
				img.fetchPriority = i === 0 ? "high" : "auto"
				img.src = `${basePath}${pad(firstFrame + i, digits)}.${ext}`
				images.push(img)

				img.onload = () => {
					frames[i] = img
					loaded += 1
					onProgressLatest.current?.(loaded, frameCount)
					priorityDone(i)

					// the canvas takes its size from the first frame to arrive; resizing clears it
					if (!sized) {
						el.width = img.naturalWidth
						el.height = img.naturalHeight
						sized = true
						painted = null
					}
					driver.redraw()
				}
				img.onerror = () => {
					loaded += 1
					onProgressLatest.current?.(loaded, frameCount)
					priorityDone(i)
				}
			}

			return () => {
				detach()
				for (const img of images) {
					img.onload = null
					img.onerror = null
					img.src = ""
				}
				frames.fill(null)
				painted = null
			}
		},
		[basePath, digits, firstFrame, frameCount, ext, priorityTo, priorityStep, enabled, driver],
		{ scope: canvas },
	)

	return <ScrubCanvas canvasRef={canvas} fit={fit} alt={alt} className={className} />
}
