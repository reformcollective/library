"use client"

import type { Renderer } from "@plutotcool/fsv"
import { useLatest } from "ahooks"
import { type RefObject, useRef } from "react"
import { useAnimation } from "../useAnimation"
import { ScrubCanvas } from "./ScrubCanvas"
import type { SequenceControl } from "./sequenceControl"
import type { SettleMode } from "./settleFrame"
import { useScrubDriver } from "./useScrubDriver"

const loadFsv = () => import("@plutotcool/fsv")

export function ScrubbedVideo({
	src,
	trigger,
	enabled = true,
	scrub,
	settle,
	settleThreshold,
	springStiffness,
	springDamping,
	scrubFrom,
	progressCurve,
	controlRef,
	start,
	end,
	fit = "cover",
	alt = "",
	alpha = false,
	priorityFrames = 1,
	onReady,
	onLoaded,
	onError,
	className,
}: {
	src: string
	trigger: RefObject<HTMLElement | null>
	/** false keeps the file from loading */
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
	/** 1-based frame shown at the top of the trigger. earlier frames are for `controlRef` to play */
	scrubFrom?: number
	/** remaps scroll progress (0-1) to the share of the video shown (0-1). default linear */
	progressCurve?: (progress: number) => number
	controlRef?: RefObject<SequenceControl>
	/** default "top top" */
	start?: string
	/** default "bottom bottom" */
	end?: string
	/** object-fit */
	fit?: "cover" | "contain" | "fill"
	/** the canvas is aria-hidden when empty */
	alt?: string
	/** keeps the alpha track's transparency. loads the whole file, so `priorityFrames` does not apply. changing it remounts the canvas */
	alpha?: boolean
	/** frames that must load before the first draw and `onReady`. the rest load in the background */
	priorityFrames?: number
	/** fires when the first frame is on screen */
	onReady?: () => void
	/** fires once every frame has loaded */
	onLoaded?: () => void
	/** fires on load or decode failure. without it the error is logged */
	onError?: (error: unknown) => void
	className?: string
}) {
	const canvas = useRef<HTMLCanvasElement>(null)
	const onReadyLatest = useLatest(onReady)
	const onLoadedLatest = useLatest(onLoaded)
	const onErrorLatest = useLatest(onError)

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
		scrubFromIndex: scrubFrom === undefined ? 0 : scrubFrom - 1,
		progressCurve,
		controlRef,
	})

	// biome-ignore lint/correctness/useExhaustiveDependencies: callbacks are read through latest refs so changing them must not restart the effect
	useAnimation(
		() => {
			const el = canvas.current
			if (!el || !enabled) return

			let closed = false
			let renderer: Renderer | undefined
			let detach: (() => void) | undefined
			let reader:
				| ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>
				| undefined
			let ready = false
			const abort = new AbortController()

			const fail = (error: unknown) => {
				if (closed) return
				const handler = onErrorLatest.current
				if (handler) handler(error)
				else console.error(error)
			}

			const load = async () => {
				const { Renderer } = await loadFsv()
				if (closed) return
				const instance = new Renderer({ canvas: el, context: { alpha } })
				renderer = instance
				if (alpha) {
					await instance.load(src)
				} else {
					const response = await fetch(src, { signal: abort.signal })
					if (!response.ok || !response.body) {
						throw new Error(
							`ScrubbedVideo: failed to fetch ${src} (${response.status})`,
						)
					}
					const source = response.body.getReader()
					/** fsv does not handle stream errors, so a failed read is reported here and ends the stream. */
					const guarded = new ReadableStream<Uint8Array<ArrayBuffer>>({
						pull: async (controller) => {
							try {
								const { done, value } = await source.read()
								if (done) controller.close()
								else controller.enqueue(value)
							} catch (error) {
								controller.close()
								fail(error)
							}
						},
						cancel: (reason) => source.cancel(reason),
					})
					reader = guarded.getReader()
					const stream = await instance.loadStream(reader)
					await stream.loaded(Math.min(priorityFrames, instance.length))
					void stream.loaded().then(() => {
						if (closed) return
						driver.redraw()
						onLoadedLatest.current?.()
					})
				}
				if (closed) return
				detach = driver.attach({
					length: instance.length,
					show: (index) => {
						instance.set(index)
						if (!ready) {
							ready = true
							onReadyLatest.current?.()
						}
					},
				})
				if (alpha && !closed) onLoadedLatest.current?.()
			}

			load().catch(fail)

			return () => {
				closed = true
				detach?.()
				/** Cancelling the reader ends fsv's read loop quietly, aborting the fetch would make it throw. */
				if (reader) void reader.cancel().catch(() => {})
				else abort.abort()
				renderer?.close()
			}
		},
		[src, alpha, priorityFrames, enabled, driver],
		{ scope: canvas },
	)

	return (
		<ScrubCanvas
			key={String(alpha)}
			canvasRef={canvas}
			fit={fit}
			alt={alt}
			className={className}
		/>
	)
}
