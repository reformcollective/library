"use client"

import type { VideoLabels } from "library/videos/types"
import { createContext } from "react"

export interface PartsContextValue {
	labels: Partial<VideoLabels>
	placement: "overlay" | "below"
}

export const PartsContext = createContext<PartsContextValue>({
	labels: {},
	placement: "overlay",
})
