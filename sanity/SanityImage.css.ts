import { createVar, style } from "@vanilla-extract/css"

import { library } from "library/layers.css"

export const lqipVar = createVar({
	initialValue: "none",
	syntax: "*",
	inherits: false,
})

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

export const lqipObjectFitVar = createVar({
	initialValue: "cover",
	syntax: "*",
	inherits: false,
})

export const hotspotObjectPositionVar = createVar({
	initialValue: "center",
	syntax: "*",
	inherits: false,
})

export const sanityImageClass = style({
	"@layer": {
		[library]: {
			backgroundImage: lqipVar,
			backgroundSize: lqipObjectFitVar,
			backgroundRepeat: "no-repeat",
			backgroundPosition: "center",
			objectPosition: hotspotObjectPositionVar,
			filter: lqipFilterVar,
			imageRendering: lqipImageRenderingVar,
		},
	},
})
