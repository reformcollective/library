import { createVar, style } from "@vanilla-extract/css"
import { library } from "library/layers.css"
import { objectFitVar, objectPositionVar } from "library/StaticImage.css"

export const lqipVar = createVar({
	initialValue: "none",
	syntax: "*",
	inherits: false,
})

/**
 * Applied to transparent LQIPs only. `pixelated` upscales the tiny thumbnail
 * as hard blocks; `blur()` then smooths those into an even result. Both revert
 * to their defaults once the image loads.
 */
export const lqipFilterVar = createVar({
	initialValue: "none",
	syntax: "*",
	inherits: false,
})

export const lqipImageRenderingVar = createVar({
	initialValue: "auto",
	syntax: "*",
	inherits: false,
})

export const lqipClass = style({
	"@layer": {
		[library]: {
			backgroundImage: lqipVar,
			backgroundSize: objectFitVar,
			backgroundRepeat: "no-repeat",
			backgroundPosition: objectPositionVar,
			filter: lqipFilterVar,
			// @ts-expect-error — TS doesn't accept a CSS var here but browsers handle it fine
			imageRendering: lqipImageRenderingVar,
		},
	},
})
