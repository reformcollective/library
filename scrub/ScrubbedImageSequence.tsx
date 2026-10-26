"use client"

import { useLatest } from "ahooks"
import { type RefObject, useRef } from "react"
import { useAnimation } from "../useAnimation"
import { ScrubCanvas } from "./ScrubCanvas"
import type { SequenceControl } from "./sequenceControl"
import type { SettleMode } from "./settleFrame"
import { useScrubDriver } from "./useScrubDriver"

/** first, last, then midpoints of ever smaller spans, so any prefix covers the clip evenly */
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
	/** url prefix, up to the frame number */
	basePath: string
	/** zero-padded width of the frame number */
	digits?: number
	firstFrame?: number
	lastFrame: number
	/** file extension without the dot. default "avif" */
	ext?: string
	/** frame number shown at the top of the trigger. earlier frames are for `controlRef` to play. default `firstFrame` */
	scrubFrom?: number
	/** remaps scroll progress (0-1) to the share of frames shown (0-1) */
	progressCurve?: (progress: number) => number
	/** frames to load first: every `step` frames from `firstFrame` up to `to`, then `to` itself */
	priority?: { to: number; step: number }
	controlRef?: RefObject<SequenceControl>
	/** fires once every `priority` frame has loaded or failed */
	onPriorityLoaded?: () => void
	trigger: RefObject<HTMLElement | null>
	/** false keeps every frame from loading */
	enabled?: boolean
	/** seconds of lerp, as ScrollTrigger's scrub. default 1 */
	scrub?: number | boolean
	/** how the frame lands at the end of an eased scrub, see README. default "off" */
	settle?: SettleMode
	/** frames, for `settle`. default 2 */
	settleThreshold?: number
	/** with both set, a spring replaces the scrub tween and `scrub` and `settle` are ignored */
	springStiffness?: number
	springDamping?: number
	/** default "top top" */
	start?: string
	/** default "bottom bottom" */
	end?: string
	/** object-fit */
	fit?: "cover" | "contain" | "fill"
	/** the canvas is aria-hidden when empty */
	alt?: string
	/** loaded or failed frame count */
	onProgress?: (loaded: number, total: number) => void
	/** fires when the first frame is on screen */
	onReady?: () => void
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: callbacks are read through latest refs so changing them must not restart the effect
	useAnimation(
		() => {
			const el = canvas.current
			if (!el || !enabled) return

			const frames: (HTMLImageElement | null)[] = Array.from(
				{ length: frameCount },
				() => null,
			)
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
					const after =
						index + offset < frameCount ? frames[index + offset] : null
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
				const last = Math.min(
					Math.max(priorityTo - firstFrame, 0),
					frameCount - 1,
				)
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
			if (priorityWaiting === 0 && priorityTo !== undefined)
				onPriorityLoadedLatest.current?.()

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

					/** The canvas takes its size from the first frame to arrive, and resizing clears it. */
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
		[
			basePath,
			digits,
			firstFrame,
			frameCount,
			ext,
			priorityTo,
			priorityStep,
			enabled,
			driver,
		],
		{ scope: canvas },
	)

	return (
		<ScrubCanvas canvasRef={canvas} fit={fit} alt={alt} className={className} />
	)
}
