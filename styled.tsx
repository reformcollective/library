/**
 * Styled Utilities
 *
 * There are a few different things going on here:
 *
 * - First, if you want to understand how this file works, you should first familiarize yourself
 *   with the restyle library, which forms the base of this solution:
 *   https://www.restyle.dev/
 *
 * - We also need to convert CSS strings into CSS Objects. I'm doing this by compiling the CSS
 *   into an AST using stylis and then serializing it into a CSS Object.
 *
 * - Once we have a CSS Object, we can convert it to responsive values by deeply traversing the
 *   object and replacing values with responsive values.
 *
 * - The final bit of the puzzle is to prevent duplicate selectors and media queries from overwriting each other.
 *   We do this by using whitespace so that each key is unique, and they don't conflict. Each styled call
 *   resets the whitespace to an empty string, and each time we parse new CSS, we append one space to the selector.
 *
 */

import config from "libraryConfig"
import { type CSSObject, keyframes as restyleKeyframes } from "restyle"
import { styled as restyled } from "restyle"
import type { KeyframesObject } from "restyle/keyframes"
import media, {
	desktopBreakpoint,
	desktopDesignSize,
	mobileDesignSize,
	tabletDesignSize,
} from "styles/media"
import {
	COMMENT,
	DECLARATION,
	type Element,
	IMPORT,
	MEDIA,
	RULESET,
	compile,
} from "stylis"

/**
 * converts a css property value to camelCase
 */
const convertToCamelCase = (str: string) => {
	if (str.startsWith("--")) return str
	return str.replace(/-([a-z])/g, (g) => g[1]?.toUpperCase() ?? "")
}

/**
 * recursively serializes stylis output into a CSS Object
 * works in tandem with addToObj
 */
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

/**
 * does the actual conversion from stylis output to CSS Object
 * works in tandem with serializeToObject
 */
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

			// each element will have a parent, which will have a parent, etc. until we get to a parentless element
			const getParentSelectors = (element: Element | null): string[] => {
				if (!element) return []
				// media queries are hoisted to the top level
				if (element.type === MEDIA) return getParentSelectors(element.parent)
				// i do not know why - but stylis adds a \f character to some selectors
				const selectors = element.value.replaceAll("&\f", "&").split(",")
				// nested selectors are passed as-is
				const isTopLevel = !element?.parent

				return [
					...getParentSelectors(element.parent),
					selectors
						.map((selector) => {
							// restyle requires the use of ampersand in nested selectors, but stylis does not include it
							// there are some exceptions to this rule though:
							const needsNoAmpersand =
								selector.includes("&") ||
								selector.startsWith(":") ||
								selector.startsWith("[")
							return allowAmpersand
								? needsNoAmpersand
									? selector
									: isTopLevel
										? `& ${selector}`
										: selector
								: selector
						})
						.join(","),
				]
			}

			const recurseAndAdd = (
				remainingSelectors: string[],
				object: Record<string, unknown>,
			) => {
				const [nextSelector, ...remaining] = remainingSelectors
				if (remaining.length === 0) {
					if (typeof element.children === "string")
						throw new Error(
							"Unexpected case! String children in nested ruleset. Report the css that caused this.",
						)
					object[nextSelector + selectorHash] = serializeToObject({
						elements: element.children,
						selectorHash,
						allowAmpersand,
					})
				} else if (nextSelector) {
					const next =
						typeof object[nextSelector] === "object"
							? (object[nextSelector] ?? {})
							: {}
					recurseAndAdd(remaining, next as Record<string, unknown>)
					object[nextSelector] = next
				}
			}

			const selectors = getParentSelectors(element)
			recurseAndAdd(selectors, obj)

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

/**
 * takes in a CSS string and converts it to a CSS Object
 * @param css the css to process
 * @param selectorHash the hash to use for selector uniqueness, should be whitspace
 * @param allowAmpersand whether to allow ampersand in nested selectors. keyframes shouldn't need these
 * @returns the processed CSS Object
 */
const convertCssToObject = (
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
 * Converting CSS Objects into Responsive CSS Objects
 */

type Options = {
	only?: "mobile" | "tablet" | "desktop" | "fullWidth"
	scaleFully?: boolean
}

const PRECISION = 3
const regex = /(\d+\.?\d*)px/g
const replacer = (match: string, breakpoint: number) => {
	return ((Number.parseFloat(match) / breakpoint) * 100).toFixed(PRECISION)
}
const designSizes = {
	fullWidth: desktopDesignSize,
	desktop: desktopDesignSize,
	tablet: tabletDesignSize,
	mobile: mobileDesignSize,
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
				output[hashedMedia[only]] = {
					...(output[hashedMedia[only]] ?? {}),
					[key]: value
						?.toString()
						.replaceAll(regex, (_: unknown, px: string) =>
							only === "fullWidth" && !shouldScaleFully
								? `${(
										(Number.parseFloat(replacer(px, desktopDesignSize)) / 100) *
										desktopBreakpoint
									).toFixed(1)}px`.replace(".0px", "px")
								: `${replacer(px, designSizes[only])}vw`,
						),
				}
			} else if (String(value).match(regex)) {
				/**
				 * generate media queries for each breakpoint
				 */
				output[hashedMedia.fullWidth] = {
					...(output[hashedMedia.fullWidth] ?? {}),
					[key]: value
						?.toString()
						.replaceAll(regex, (_: unknown, px: string) =>
							shouldScaleFully
								? `${replacer(px, desktopDesignSize)}vw`
								: `${(
										(Number.parseFloat(replacer(px, desktopDesignSize)) / 100) *
										desktopBreakpoint
									).toFixed(1)}px`.replace(".0px", "px"),
						),
				}

				/* convert desktop values (not including full width) */
				output[hashedMedia.desktop] = {
					...(output[hashedMedia.desktop] ?? {}),
					[key]: value
						?.toString()
						.replaceAll(
							regex,
							(_: unknown, px: string) =>
								`${replacer(px, desktopDesignSize)}vw`,
						),
				}

				/* convert tablet values */
				output[hashedMedia.tablet] = {
					...(output[hashedMedia.tablet] ?? {}),
					[key]: value
						?.toString()
						.replaceAll(
							regex,
							(_: unknown, px: string) => `${replacer(px, tabletDesignSize)}vw`,
						),
				}

				/* convert mobile values */
				output[hashedMedia.mobile] = {
					...(output[hashedMedia.mobile] ?? {}),
					[key]: value
						?.toString()
						.replaceAll(
							regex,
							(_: unknown, px: string) => `${replacer(px, mobileDesignSize)}vw`,
						),
				}
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
 * fixes combined nesetd selectors
 * otherwise, visually has no effect, but produces smaller CSS files
 */
export const mergeStyles = (styles: CSSObject) => {
	const output: CSSObject = {}

	for (const [key, value] of Object.entries(styles)) {
		const selectors = key.split(",").map((key) => key.trim())
		for (const selector of selectors) {
			const existing = output[selector]
			if (typeof value === "object" && typeof existing === "object") {
				output[selector] = mergeStyles({
					...existing,
					...value,
				})
			} else if (typeof value === "object") {
				output[selector] = mergeStyles(value as CSSObject) // CSSProperties is deprecated and the type is bad
			} else {
				output[selector] = value
			}
		}
	}

	return output
}

/**
 * Creates a JSX component that forwards a `className` prop with the generated
 * atomic class names to the provided `Component`. Additionally, a `css` prop can
 * be provided to override the initial `styles`.
 *
 * Note, the provided component must accept a `className` prop.
 */
export const styled: typeof restyled = (component, styles) => {
	hashCounter = 0

	if (styles === undefined) return restyled(component)

	return restyled(
		component,
		typeof styles === "function"
			? (props) => mergeStyles(styles(props))
			: mergeStyles(styles),
	)
}

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
export const flarge = (style: string) => ({
	...convertToResponsive(convertCssToObject(style, hashCounter), {
		only: "fullWidth",
		selectorHash: hashCounter++,
	}),
	...convertToResponsive(convertCssToObject(style, hashCounter), {
		only: "desktop",
		selectorHash: hashCounter++,
	}),
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
