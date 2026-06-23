"use client"

import MuxVideoComponent from "@mux/mux-video-react"
import { useRafInterval } from "ahooks"
import { type ComponentProps, type Ref, useEffect, useRef } from "react"

import { useCombinedRefs } from "../useCombinedRefs"

type ReformMuxVideoProps = Pick<
	ComponentProps<typeof MuxVideoComponent>,
	| "autoPlay"
	| "onTimeUpdate"
	| "onPlay"
	| "onPause"
	| "playbackId"
	| "className"
	| "style"
	| "muted"
	| "loop"
	| "playsInline"
	| "preload"
	| "onSeeked"
	| "controls"
	| "poster"
> & {
	ref?: Ref<HTMLVideoElement>
	autoPlayFallbackTime?: number
	onEnded?: (event: Event) => void
	preloadTrackable?: boolean
}

// pseudo ended logic from mux/elements
// copied here because mux doesn't fire this reliably either
const DEFAULT_ENDED_MOE = 0.034
const isApproximatelyEqual = (x: number, y: number, moe = DEFAULT_ENDED_MOE) =>
	Math.abs(x - y) <= moe
export const isPseudoEnded = (mediaEl: HTMLMediaElement, moe = DEFAULT_ENDED_MOE) => {
	return (
		mediaEl.currentTime >= mediaEl.duration ||
		(mediaEl.paused && isApproximatelyEqual(mediaEl.currentTime, mediaEl.duration, moe))
	)
}

export function MuxVideo({
	ref,
	autoPlay,
	autoPlayFallbackTime,
	onEnded,
	onTimeUpdate,
	playbackId,
	preloadTrackable,
	onPlay,
	onPause,
	...props
}: ReformMuxVideoProps) {
	const localRef = useRef<HTMLVideoElement>(null)
	const playing = useRef<boolean>(false)

	const checkEnded = () => {
		if (!playing.current) return
		if (!localRef.current) return

		if (isPseudoEnded(localRef.current)) {
			playing.current = false
			const event = new Event("ended")
			localRef.current.dispatchEvent(event)
			onEnded?.(event)
		}
	}

	useRafInterval(() => {
		checkEnded()
	}, 100)

	useEffect(() => {
		if (autoPlay) {
			localRef.current
				?.play()
				.then(() => {
					playing.current = true
				})
				.catch((e: Error) => {
					if (e.name === "NotAllowedError") {
						if (localRef.current) {
							localRef.current.currentTime = autoPlayFallbackTime ?? localRef.current?.duration
							localRef.current.preload = "metadata"

							// can't play, dispatch ended immediately
							const event = new Event("ended")
							localRef.current.dispatchEvent(event)
							onEnded?.(event)
						}
					}
				})
		}
	}, [autoPlay, autoPlayFallbackTime, onEnded])

	return (
		<MuxVideoComponent
			ref={useCombinedRefs(localRef, ref)}
			preferPlayback="mse"
			renditionOrder="desc"
			onPlay={(e) => {
				onPlay?.(e)
				playing.current = true
			}}
			onPause={(e) => {
				onPause?.(e)
				playing.current = false
			}}
			onTimeUpdate={(e) => {
				onTimeUpdate?.(e)
				checkEnded()
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
			playbackId={playbackId}
			data-preload-track={playbackId}
			{...props}
		/>
	)
}
