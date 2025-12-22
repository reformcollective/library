import { createVar, style } from "@vanilla-extract/css"
import { library } from "library/layers.css"

export const objectFitVar = createVar({
	initialValue: "cover",
	syntax: "*",
	inherits: false,
})

export const objectPositionVar = createVar({
	initialValue: "center",
	syntax: "*",
	inherits: false,
})

export const aspectRatioVar = createVar({
	initialValue: "auto",
	syntax: "*",
	inherits: false,
})

export const defaultImageClass = style({
	"@layer": {
		[library]: {
			display: "block",
			objectFit: objectFitVar,
			objectPosition: objectPositionVar,
			height: "auto",
			aspectRatio: aspectRatioVar,
		},
	},
})
