"use client"

import MuxVideoComponent from "@mux/mux-video-react"
import { type ComponentProps, type Ref, useEffect, useRef } from "react"
import type { ZodUndefined } from "zod"
import { useCombinedRefs } from "../useCombinedRefs"

export function MuxVideo({
	ref,
	autoPlay,
	autoPlayFallbackTime,
	playbackId,
	preloadTrackable,
	...props
}: ComponentProps<typeof MuxVideoComponent> & {
	ref?: Ref<HTMLVideoElement>
	autoplay?: ZodUndefined
	autoPlayFallbackTime?: number
	playbackId?: string
	preloadTrackable?: boolean
}) {
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
				const newTime = e.currentTarget.currentTime
				const duration = e.currentTarget.duration
				if (Math.abs(newTime - duration) < 0.01) {
					hasFinished.current = true
					if (!hasFinished.current)
						e.currentTarget.dispatchEvent(new Event("ended"))
				} else {
					hasFinished.current = false
				}
			}}
			onEnded={(e) => {
				// NOTE: Browsers do not consistently fire an 'ended' event upon seeking to the
				// end of the media while already paused. This was due to an ambiguity in the
				// HTML specification, but is now more explicit.
				// we reimplement these events manually to ensure they fire consistently
				e.stopPropagation()
			}}
			_hlsConfig={{
				backBufferLength: 0,
			}}
			playbackId={playbackId}
			data-preload-track={preloadTrackable ? playbackId : undefined}
			{...props}
		/>
	)
}
