"use client"

import type { Support, VideoFeature, VideoLabels, VideoState } from "library/videos/types"
import { useVideo } from "library/videos/controller/useVideo"
import { useContext } from "react"
import { DEFAULT_LABELS } from "./defaultLabels"
import { PartsContext } from "./context"
import type { ReactNode } from "react"
import type { PartChildren } from "./types"

const RANK: Record<Support, number> = {
	yes: 3,
	"best-effort": 2,
	unverified: 1,
	no: 0,
}

export function usePart(features: readonly VideoFeature[], alwaysShow = false) {
	const { state, controller, capabilities, media } = useVideo()
	const { labels, placement } = useContext(PartsContext)

	let support: Support = features.length === 0 ? "yes" : "no"
	for (const feature of features) {
		const value = capabilities[feature]
		if (RANK[value] > RANK[support]) support = value
	}

	const visible = alwaysShow || support === "yes" || support === "best-effort"
	const text = (key: keyof VideoLabels): string => labels[key] ?? DEFAULT_LABELS[key]

	return { state, controller, media, placement, support, visible, text }
}

export function resolveChildren(
	children: PartChildren,
	state: VideoState,
	fallback: ReactNode,
): ReactNode {
	if (children === undefined) return fallback
	return typeof children === "function" ? children(state) : children
}
