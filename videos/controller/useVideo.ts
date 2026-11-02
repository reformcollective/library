"use client"

import type {
	ProviderCapabilities,
	VideoController,
	VideoState,
} from "library/videos/types"
import { use } from "react"
import {
	VideoContext,
	type VideoContextValue,
	VideoStateContext,
} from "./VideoContext"

export function useVideoContext(): VideoContextValue {
	const context = use(VideoContext)
	if (!context)
		throw new Error("useVideo must be called under <UniversalVideo>")
	return context
}

/** Reads the state, controller and capabilities of the surrounding UniversalVideo. */
export function useVideo(): {
	state: VideoState
	controller: VideoController
	capabilities: ProviderCapabilities
	media: HTMLElement | null
} {
	const context = useVideoContext()
	const state = use(VideoStateContext)
	if (!state) throw new Error("useVideo must be called under <UniversalVideo>")
	return {
		state,
		controller: context.controller,
		capabilities: context.capabilities,
		media: context.media,
	}
}
