import { createVar, globalStyle } from "@vanilla-extract/css"
import { desktopBreakpoint, mobileBreakpoint, tabletBreakpoint } from "app/styles/media"
import { foundation } from "library/layers.css"

export const isMobile = createVar()
export const isTablet = createVar()
export const isDesktop = createVar()
export const isFull = createVar()

globalStyle(":root", {
	"@layer": {
		[foundation]: {
			vars: {
				[isMobile]: "1",
				[isTablet]: "0",
				[isDesktop]: "0",
				[isFull]: "0",
			},
			"@media": {
				[`screen and (min-width: ${mobileBreakpoint + 1}px)`]: {
					vars: { [isMobile]: "0", [isTablet]: "1" },
				},
				[`screen and (min-width: ${tabletBreakpoint + 1}px)`]: {
					vars: { [isTablet]: "0", [isDesktop]: "1" },
				},
				[`screen and (min-width: ${desktopBreakpoint + 1}px)`]: {
					vars: { [isDesktop]: "0", [isFull]: "1" },
				},
			},
		},
	},
})
