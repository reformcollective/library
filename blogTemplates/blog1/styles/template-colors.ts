import { isBrowser } from "library/deviceDetection"

/**
 * place all your colors here! the format is:
 * [hex color, optional p3 color]
 *
 * if you provide a p3 color, it will be used where supported
 */
const rawColors = {
	black: ["#000000"],
	white: ["#ffffff"],
	red: ["#ff0000"],
	blue: ["#0000ff"],
	green: ["#00ff00"],
} as const satisfies Record<string, [string, string] | [string]>

export type ColorType = keyof typeof rawColors

const browserSupportsP3 =
	isBrowser && window.matchMedia("(color-gamut: p3)").matches

/**
 * convert the raw colors to an object with the correct color for the current browser
 */
const CSSColors = Object.fromEntries(
	Object.entries(rawColors as Record<string, [string, string] | [string]>).map(
		([key, [color, p3color]]) => {
			return [key, browserSupportsP3 && p3color ? p3color : color]
		},
	),
) as {
	[key in keyof typeof rawColors]: (typeof rawColors)[key][number]
}

/**
 * gsap can't animate p3 colors, so we need to use the hex always
 */
const jsColors = Object.fromEntries(
	Object.entries(rawColors as Record<string, [string, string] | [string]>).map(
		([key, [color]]) => {
			return [key, color]
		},
	),
) as {
	[key in keyof typeof rawColors]: (typeof rawColors)[key][0]
}

export default {
	...CSSColors,
	js: jsColors,
}

// {
// 	projectColors: {
// 		primary: colors.green,
// 		secondary: colors.blue,
// 		tertiary: colors.red,
// 	},
// 	}
// }
