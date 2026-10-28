"use client"

import type { VideoConfig } from "library/videos/types"
import type { ReactNode } from "react"
import { createContext, useContext, useMemo } from "react"

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
	analytics: false,
	maxConcurrent: 3,
	lookupEndpoint: "/api/video-lookup",
}

const VideoConfigContext = createContext<VideoConfig>(DEFAULT_VIDEO_CONFIG)

export function VideoConfigProvider({
	value,
	children,
}: {
	/** Merged over DEFAULT_VIDEO_CONFIG. */
	value?: Partial<VideoConfig>
	children: ReactNode
}) {
	const merged = useMemo<VideoConfig>(
		() => ({ ...DEFAULT_VIDEO_CONFIG, ...value }),
		[value],
	)
	return <VideoConfigContext value={merged}>{children}</VideoConfigContext>
}

export function useVideoConfig(): VideoConfig {
	return useContext(VideoConfigContext)
}
