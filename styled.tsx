import { type CSSObject, keyframes as restyleKeyframes } from "restyle"
import type { KeyframesObject } from "restyle/keyframes"
import {
	COMMENT,
	DECLARATION,
	type Element,
	IMPORT,
	RULESET,
	compile,
} from "stylis"
import { styled as restyled } from "restyle"

import config from "libraryConfig"
import media, {
	desktopBreakpoint,
	desktopDesignSize,
	mobileDesignSize,
	tabletDesignSize,
} from "@/app/styles/media"

const PRECISION = 3

const replacer = (match: string, breakpoint: number) => {
	return ((Number.parseFloat(match) / breakpoint) * 100).toFixed(PRECISION)
}

/**
 * detects pixel values
 */
const regex = /(\d+.?\d*)px/g

const designSizes = {
	desktop: desktopDesignSize,
	tablet: tabletDesignSize,
	mobile: mobileDesignSize,
}

type Options = { only?: "mobile" | "tablet" | "desktop"; scaleFully?: boolean }

const convertToCamelCase = (str: string) => {
	return str.replace(/-([a-z])/g, (g) => g[1]?.toUpperCase() ?? "")
}

const addToObj = ({
	element,
	obj,
	selectorHash,
	allowAmpersand,
}: {
	element: Element
	obj: Record<string, unknown>
	selectorHash: string
	allowAmpersand: boolean
}) => {
	switch (element.type) {
		case DECLARATION:
			if (Array.isArray(element.props))
				throw new Error(
					"Unexpected case! Array of props in declaration. Report the css that caused this.",
				)
			obj[convertToCamelCase(element.props)] = element.children
			return
		case COMMENT:
			return
		case RULESET: {
			if (!element.children.length) return
			if (typeof element.children === "string")
				throw new Error(
					"Unexpected case! String children in ruleset. Report the css that caused this.",
				)
			if (typeof element.props === "string")
				throw new Error(
					"Unexpected case! String props in ruleset. Report the css that caused this.",
				)

			const selector = element.props
				.map((selector) =>
					// restyle requires the use of ampersand in nested selectors, but stylis does not include it
					selector.includes("&") && allowAmpersand ? selector : `& ${selector}`,
				)
				.join(",")

			obj[selector + selectorHash] = serializeToObject({
				elements: element.children,
				selectorHash,
				allowAmpersand,
			})
			return
		}
		case IMPORT:
			throw new Error("Use javascript imports instead of @import")
		default:
			if (!element.children.length) return
			if (typeof element.children === "string")
				throw new Error(
					"Unexpected case! String children in default case. Report the css that caused this.",
				)
			obj[element.value + selectorHash] = serializeToObject({
				elements: element.children,
				selectorHash,
				allowAmpersand,
			})
			return
	}
}

const serializeToObject = ({
	elements,
	selectorHash,
	allowAmpersand,
}: {
	elements: Element[]
	selectorHash: string
	allowAmpersand: boolean
}) => {
	const obj = {}
	for (const element of elements) {
		addToObj({ element, obj, selectorHash, allowAmpersand })
	}
	return obj as CSSObject
}

export const convertCssToObject = (
	css: string,
	selectorHash: number,
	allowAmpersand = true,
) => {
	const compiled = compile(css)
	return serializeToObject({
		elements: compiled,
		allowAmpersand,
		selectorHash: " ".repeat(selectorHash),
	})
}

/**
 * takes in css containing pixel values and generates scaling media queries using the breakpoints
 * @param cssIn
 * @returns
 */
function convertToResponsive(
	cssIn: CSSObject,
	{
		only,
		scaleFully,
		selectorHash,
	}: Options & {
		selectorHash: number
	},
): CSSObject {
	const shouldScaleFully = scaleFully ?? config.scaleFully

	const hashedMedia = {
		fullWidth: `${media.fullWidth}${" ".repeat(selectorHash)}`,
		desktop: `${media.desktop}${" ".repeat(selectorHash)}`,
		tablet: `${media.tablet}${" ".repeat(selectorHash)}`,
		mobile: `${media.mobile}${" ".repeat(selectorHash)}`,
	}

	const output: CSSObject =
		// when only is specified, styles are not top-level
		only ? {} : { ...cssIn }

	for (const [key, value] of Object.entries(cssIn)) {
		if (typeof value !== "object") {
			if (only) {
				/**
				 * generate media query for a single breakpoint
				 */
				output[hashedMedia[only]] ||= {}
				// @ts-expect-error typescript cannot narrow here
				output[hashedMedia[only]][key] = value
					?.toString()
					.replaceAll(
						regex,
						(_: unknown, px: string) => `${replacer(px, designSizes[only])}vw`,
					)
			} else if (String(value).match(regex)) {
				/**
				 * generate media queries for each breakpoint
				 */
				/* convert full width values (not including smaller desktops that would always scale) */
				output[hashedMedia.fullWidth] ||= {}
				// @ts-expect-error typescript cannot narrow here
				output[hashedMedia.fullWidth][key] = value
					?.toString()
					.replaceAll(regex, (_: unknown, px: string) =>
						shouldScaleFully
							? `${replacer(px, desktopDesignSize)}vw`
							: `${(
									(Number.parseFloat(replacer(px, desktopDesignSize)) / 100) *
									desktopBreakpoint
								).toFixed(1)}px`.replace(".0px", "px"),
					)

				/* convert desktop values (not including full width) */
				output[hashedMedia.desktop] ||= {}
				// @ts-expect-error typescript cannot narrow here
				output[hashedMedia.desktop][key] = value
					?.toString()
					.replaceAll(
						regex,
						(_: unknown, px: string) => `${replacer(px, desktopDesignSize)}vw`,
					)

				/* convert tablet values */
				output[hashedMedia.tablet] ||= {}
				// @ts-expect-error typescript cannot narrow here
				output[hashedMedia.tablet][key] = value
					?.toString()
					.replaceAll(
						regex,
						(_: unknown, px: string) => `${replacer(px, tabletDesignSize)}vw`,
					)

				/* convert mobile values */
				output[hashedMedia.mobile] ||= {}
				// @ts-expect-error typescript cannot narrow here
				output[hashedMedia.mobile][key] = value.replaceAll(
					regex,
					(_: unknown, px: string) => `${replacer(px, mobileDesignSize)}vw`,
				)
			}
		} else {
			output[key] = convertToResponsive(value as CSSObject, {
				only,
				scaleFully,
				selectorHash: selectorHash,
			})
		}
	}

	return output
}

/**
 * A helper function to add additional props to a React component.
 * @template P - The type of props for the wrapped component.
 * @param Component - The React component to wrap.
 * @param addedProps - The props to add to the component.
 * @returns A new component with the added props.
 */
export function attrs<Props, usedKeys extends keyof Props>(
	Component: React.ComponentType<Props>,
	addedProps: Pick<Props, usedKeys>,
) {
	return (props: Omit<Props, usedKeys>) => {
		// @ts-expect-error doesn't need to be perfect
		return <Component {...addedProps} {...props} />
	}
}

// because objects cannot have duplicate keys, we use whitespace to differentiate them
// starting with 1 space at the end of a selector/query and incrementing from there
// this will reset for each styled call via our proxy
let hashCounter = 0

/**
 * Creates a JSX component that forwards a `className` prop with the generated
 * atomic class names to the provided `Component`. Additionally, a `css` prop can
 * be provided to override the initial `styles`.
 *
 * Note, the provided component must accept a `className` prop.
 */
export const styled = new Proxy(restyled, {
	apply(target, thisArg, args) {
		hashCounter = 0
		return Reflect.apply(target, thisArg, args)
	},
})

/**
 * simple utility for composing styles as a string
 */
export const css = String.raw
export { media, GlobalStyles, type CSSObject, type CSSValue } from "restyle"
export const fresponsive = (style: string, options?: Options) =>
	convertToResponsive(convertCssToObject(style, hashCounter), {
		...options,
		selectorHash: hashCounter++,
	})
export const ftablet = (style: string) =>
	convertToResponsive(convertCssToObject(style, hashCounter), {
		only: "tablet",
		selectorHash: hashCounter++,
	})
export const fmobile = (style: string) =>
	convertToResponsive(convertCssToObject(style, hashCounter), {
		only: "mobile",
		selectorHash: hashCounter++,
	})
export const unresponsive = (style: string) =>
	convertCssToObject(style, hashCounter)
export const keyframes = (...args: Parameters<typeof String.raw>) =>
	restyleKeyframes(
		convertCssToObject(String.raw(...args), 0, false) as KeyframesObject,
	)
