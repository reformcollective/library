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
			_hlsConfig={{
				backBufferLength: 0,
			}}
			playbackId={playbackId}
			data-preload-track={preloadTrackable ? playbackId : undefined}
			{...props}
		/>
	)
}
