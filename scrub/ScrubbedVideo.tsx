"use client"

import type { Renderer } from "@plutotcool/fsv"
import { useLatest } from "ahooks"
import { type RefObject, useRef } from "react"
import { useAnimation } from "../useAnimation"
import { ScrubCanvas } from "./ScrubCanvas"
import type { SequenceControl } from "./sequenceControl"
import type { SettleMode } from "./settleFrame"
import { useScrubDriver } from "./useScrubDriver"

// loaded on demand so the decoder and renderer are code-split and never run on the server
const loadFsv = () => import("@plutotcool/fsv")

/**
 * A video scrubbed by scroll, drawn to a canvas. Needs the optional `@plutotcool/fsv` package, see README.md.
 *
 * Scrubbing a `<video>`'s `currentTime` stops repainting on Safari once the tab has been in the background,
 * so the clip is an .fsv file (every frame decodable on its own, streamed in one request) rendered with WebGL.
 */
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
	/** url of the .fsv file */
	src: string
	/** element whose scroll drives the video */
	trigger: RefObject<HTMLElement | null>
	/** false keeps the file from loading, for a layout that is hidden at this size */
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
	/**
	 * the frame number (1 is the first) scroll starts from: the top of the trigger shows this frame and the bottom shows the last.
	 * the frames before it are for something else to play, by `controlRef`, so the video can open on a clock and hand over to scroll where it left off
	 */
	scrubFrom?: number
	/** remaps scroll progress (0-1) to the share of the video shown (0-1), for a video that holds, speeds up or slows down along the track. defaults to linear */
	progressCurve?: (progress: number) => number
	/** see `SequenceControl` */
	controlRef?: RefObject<SequenceControl>
	/** default "top top" */
	start?: string
	/** default "bottom bottom" */
	end?: string
	/** how the frame fills the element, as object-fit */
	fit?: "cover" | "contain" | "fill"
	/** describes the animation for assistive tech; the canvas is aria-hidden when empty */
	alt?: string
	/** true for a video with an alpha track, so the canvas keeps its transparency. an alpha video is loaded whole, not streamed, so `priorityFrames` does not apply. changing it remounts the canvas, as a canvas keeps its first WebGL context */
	alpha?: boolean
	/** frames, from the start, that must have loaded before the first frame is drawn and `onReady` fires. the rest keep loading in the background, and scrubbing past them holds the last frame until they arrive */
	priorityFrames?: number
	/** fires once the priority frames are in and the first frame is on screen */
	onReady?: () => void
	/** fires once every frame has loaded */
	onLoaded?: () => void
	/** fires if the file fails to load or the browser cannot decode it. without it the error is logged and the canvas stays blank */
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

	useAnimation(
		() => {
			const el = canvas.current
			if (!el || !enabled) return

			let closed = false
			let renderer: Renderer | undefined
			let detach: (() => void) | undefined
			let reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>> | undefined
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
						throw new Error(`ScrubbedVideo: failed to fetch ${src} (${response.status})`)
					}
					const source = response.body.getReader()
					// fsv reads the stream without handling its errors, so a failed read is reported here and ends the stream
					// instead of leaving an unhandled rejection and a `loaded()` that never settles
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
						// frames that arrived after the first draw: show the one scroll calls for
						driver.redraw()
						onLoadedLatest.current?.()
					})
				}
				if (closed) return
				// onReady fires from the first draw, once a frame is on screen
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
				// an alpha video is loaded whole, so every frame is in by now
				if (alpha && !closed) onLoadedLatest.current?.()
			}

			load().catch(fail)

			return () => {
				closed = true
				detach?.()
				// cancelling the reader ends fsv's read loop quietly, aborting the fetch would make it throw
				if (reader) void reader.cancel().catch(() => {})
				else abort.abort()
				renderer?.close()
			}
		},
		[src, alpha, priorityFrames, enabled, driver],
		{ scope: canvas },
	)

	return <ScrubCanvas key={String(alpha)} canvasRef={canvas} fit={fit} alt={alt} className={className} />
}
