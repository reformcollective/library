import { createVar, style } from "@vanilla-extract/css"

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
	display: "block",
	objectFit: objectFitVar,
	objectPosition: objectPositionVar,
	height: "auto",
	width: "100%",
	aspectRatio: aspectRatioVar,
})


