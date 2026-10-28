import { createVar } from "@vanilla-extract/css"

export const aspectRatioVar = createVar({
	initialValue: "auto",
	syntax: "*",
	inherits: false,
})
