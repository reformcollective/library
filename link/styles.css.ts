import { style } from "@vanilla-extract/css"
import { library } from "library/layers.css"

export const buttonClass = style({
	"@layer": {
		[library]: {
			cursor: "pointer",
		},
	},
})
