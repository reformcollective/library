import { keyframes } from "@vanilla-extract/css"
import { eases } from "../eases"

export const startGoopAnimation = keyframes({
	"0%": {
		transform: "translate(0, 0)",
		animationTimingFunction: eases.quad.in,
	},
	"50%": {
		transform: `translate(0, var(--start-goop-level))`,
		animationTimingFunction: eases.quad.out,
	},
	"100%": {
		transform: "translate(0, 0)",
	},
})

export const endGoopAnimation = keyframes({
	"0%": {
		translate: "0 0",
		animationTimingFunction: eases.quad.in,
	},
	"50%": {
		translate: `0 var(--end-goop-level)`,
		animationTimingFunction: eases.quad.out,
	},
	"100%": {
		translate: "0 0",
	},
})
