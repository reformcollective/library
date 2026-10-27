"use client"

import { createContext } from "react"
import { DEFAULT_LABELS } from "library/videos/parts/defaultLabels"
import type {
	ProviderCapabilities,
	VideoController,
	VideoLabels,
	VideoMode,
	VideoProvider,
	VideoState,
} from "library/videos/types"

export const DEFAULT_VIDEO_LABELS: VideoLabels = DEFAULT_LABELS

export interface VideoContextValue {
	controller: VideoController
	capabilities: ProviderCapabilities
	provider: VideoProvider
	mode: VideoMode
	labels: VideoLabels
	controlsPlacement: "overlay" | "below"
	/** True when the player element is mounted, false for a poster-only or facade state. */
	playerMounted: boolean
	/** Accessible label of the video, when one was given. */
	label: string | undefined
	/** The element the player is mounted into; the media element is its first child. */
	media: HTMLElement | null
}

export const VideoContext = createContext<VideoContextValue | null>(null)

export const VideoStateContext = createContext<VideoState | null>(null)
