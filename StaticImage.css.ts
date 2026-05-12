import { createVar, style } from "@vanilla-extract/css"
import { library } from "library/layers.css"

export const aspectRatioVar = createVar({
	initialValue: "auto",
	syntax: "*",
	inherits: false,
})

export const defaultImageClass = style({
	"@layer": {
		[library]: {
			display: "block",
			objectFit: "cover",
			objectPosition: "center",
			height: "auto",
			aspectRatio: aspectRatioVar,
		},
	},
})
