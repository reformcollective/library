"use client"

import type { ComponentProps } from "react"
import { MuxVideo } from "./MuxVideo"

/**
 * @deprecated Use `UniversalVideo` and set `labels.playOverlay`. A blocked autoplay shows the play overlay.
 */
export function BatterySaverVideo({
	labels,
	...props
}: ComponentProps<typeof MuxVideo>) {
	return (
		<MuxVideo
			{...props}
			labels={{ playOverlay: "Site paused by low power mode", ...labels }}
		/>
	)
}
