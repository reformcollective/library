"use client"

import MuxVideoComponent from "@mux/mux-video-react"
import { type ComponentProps, type Ref, useEffect, useRef } from "react"
import { useCombinedRefs } from "../useCombinedRefs"

type ReformMuxVideoProps = Pick<
	ComponentProps<typeof MuxVideoComponent>,
	| "autoPlay"
	| "onTimeUpdate"
	| "playbackId"
	| "onPlay"
	| "className"
	| "style"
	| "muted"
	| "loop"
	| "playsInline"
	| "preload"
	| "onSeeked"
> & {
	ref?: Ref<HTMLVideoElement>
	autoPlayFallbackTime?: number
	onEnded?: (event: Event) => void
	debug?: boolean
}

// pseudo ended logic from mux/elements
// copied here because mux doesn't fire this reliably either
const DEFAULT_ENDED_MOE = 0.034;
const isApproximatelyEqual = (x: number, y: number, moe = DEFAULT_ENDED_MOE) => Math.abs(x - y) <= moe;
const isApproximatelyGTE = (x: number, y: number, moe = DEFAULT_ENDED_MOE) => x > y || isApproximatelyEqual(x, y, moe);
export const isPseudoEnded = (mediaEl: HTMLMediaElement, moe = DEFAULT_ENDED_MOE) => {
  return mediaEl.paused && isApproximatelyGTE(mediaEl.currentTime, mediaEl.duration, moe);
};

export function MuxVideo({
	ref,
	autoPlay,
	autoPlayFallbackTime,
	onEnded,
	onTimeUpdate,
	debug = false,
	...props
}: ReformMuxVideoProps) {
	const localRef = useRef<HTMLVideoElement>(null)
	const hasFinished = useRef<boolean>(false)

	useEffect(() => {
		if (autoPlay) {
			localRef.current?.play().catch((e: Error) => {
				if (e.name === "NotAllowedError") {
					if (localRef.current) {
						localRef.current.currentTime =
							autoPlayFallbackTime ?? localRef.current?.duration
						localRef.current.preload = "metadata"
					}
				}
			})
		}
	}, [autoPlay, autoPlayFallbackTime])

	return (
		<MuxVideoComponent
			ref={useCombinedRefs(localRef, ref)}
			preferPlayback="mse"
			renditionOrder="desc"
			onTimeUpdate={(e) => {
				if (isPseudoEnded(e.currentTarget)) {
					if (!hasFinished.current) {
						hasFinished.current = true
						const event = new Event("ended")
						e.currentTarget.dispatchEvent(event)
						onEnded?.(event)
					}
				} else {
					hasFinished.current = false
				}

				onTimeUpdate?.(e)
			}}
			onEnded={(e) => {
				// NOTE: Browsers do not consistently fire an 'ended' event upon seeking to the
				// end of the media while already paused. This was due to an ambiguity in the
				// HTML specification, but is now more explicit.
				// we reimplement these events manually to ensure they fire consistently
				e.stopPropagation()
			}}
			_hlsConfig={{
				// this might help browsers upgrade quality when looping
				backBufferLength: 0,
			}}
			{...props}
		/>
	)
}
