import type { KeyframesObject } from "restyle/keyframes";
import { keyframes as restyleKeyframes, type CSSObject } from "restyle";
import {
	COMMENT,
	compile,
	DECLARATION,
	type Element,
	IMPORT,
	RULESET,
} from "stylis";

// TODO respect library config
// import config from "libraryConfig";
import media, {
	desktopBreakpoint,
	desktopDesignSize,
	mobileDesignSize,
	tabletDesignSize,
} from "@/app/styles/media";

const PRECISION = 3;

const replacer = (match: string, breakpoint: number) => {
	return ((Number.parseFloat(match) / breakpoint) * 100).toFixed(PRECISION);
};

/**
 * detects pixel values
 */
const regex = /(\d+.?\d*)px/g;

const designSizes = {
	desktop: desktopDesignSize,
	tablet: tabletDesignSize,
	mobile: mobileDesignSize,
};

type Options = { only?: "mobile" | "tablet" | "desktop"; scaleFully?: boolean };

const convertToCamelCase = (str: string) => {
	return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

const addToObj = (element: Element, obj: Record<string, unknown>) => {
	switch (element.type) {
		case DECLARATION:
			if (Array.isArray(element.props))
				throw new Error(
					"Unexpected case! Array of props in declaration. Report the css that caused this.",
				);
			obj[convertToCamelCase(element.props)] = element.children;
			return;
		case COMMENT:
			return;
		case RULESET:
			if (!element.children.length) return;
			if (typeof element.children === "string")
				throw new Error(
					"Unexpected case! String children in ruleset. Report the css that caused this.",
				);
			if (typeof element.props === "string")
				throw new Error(
					"Unexpected case! String props in ruleset. Report the css that caused this.",
				);
			obj[element.props.join(",")] = serializeToObject(element.children);
			return;
		case IMPORT:
			throw new Error("Use javascript imports instead of @import");
		default:
			if (!element.children.length) return;
			if (typeof element.children === "string")
				throw new Error(
					"Unexpected case! String children in default case. Report the css that caused this.",
				);
			obj[element.value] = serializeToObject(element.children);
			return;
	}
};

const serializeToObject = (elements: Element[]) => {
	const obj = {};
	for (const element of elements) {
		addToObj(element, obj);
	}
	return obj as CSSObject;
};

export const convertCssToObject = (css: string) => {
	const compiled = compile(css);
	return serializeToObject(compiled);
};

/**
 * takes in css containing pixel values and generates scaling media queries using the breakpoints
 * @param cssIn
 * @returns
 */
function convertToResponsive(
	cssIn: CSSObject,
	{ only, scaleFully }: Options = {},
): CSSObject {
	const shouldScaleFully = scaleFully;
	const output: CSSObject = {
		...cssIn,
		[media.fullWidth]: {},
		[media.desktop]: {},
		[media.tablet]: {},
		[media.mobile]: {},
	};

	for (const [key, value] of Object.entries(cssIn)) {
		if (typeof value !== "object") {
			if (only) {
				/**
				 * generate media query for a single breakpoint
				 */
				// @ts-expect-error typescript cannot narrow here
				output[media[only]][key] = value.replaceAll(
					regex,
					(_: unknown, px: string) => `${replacer(px, designSizes[only])}vw`,
				);
			} else if (String(value).match(regex)) {
				/**
				 * generate media queries for each breakpoint
				 */
				/* convert full width values (not including smaller desktops that would always scale) */
				// @ts-expect-error typescript cannot narrow here
				output[media.fullWidth][key] = value.replaceAll(
					regex,
					(_: unknown, px: string) =>
						shouldScaleFully
							? `${replacer(px, desktopDesignSize)}vw`
							: `${(
									(Number.parseFloat(replacer(px, desktopDesignSize)) / 100) *
										desktopBreakpoint
								).toFixed(1)}px`.replace(".0px", "px"),
				);

				/* convert desktop values (not including full width) */
				// @ts-expect-error typescript cannot narrow here
				output[media.desktop][key] = value.replaceAll(
					regex,
					(_: unknown, px: string) => `${replacer(px, desktopDesignSize)}vw`,
				);

				/* convert tablet values */
				// @ts-expect-error typescript cannot narrow here
				output[media.tablet][key] = value.replaceAll(
					regex,
					(_: unknown, px: string) => `${replacer(px, tabletDesignSize)}vw`,
				);

				/* convert mobile values */
				// @ts-expect-error typescript cannot narrow here
				output[media.mobile][key] = value.replaceAll(
					regex,
					(_: unknown, px: string) => `${replacer(px, mobileDesignSize)}vw`,
				);
			}
		} else {
			output[key] = convertToResponsive(value as CSSObject, {
				only,
				scaleFully,
			});
		}
	}

	return output;
}

export const css = String.raw;
export { styled, media } from "restyle";
export const fresponsive = (style: string, options?: Options) =>
	convertToResponsive(convertCssToObject(style), options);
export const ftablet = (style: string) =>
	convertToResponsive(convertCssToObject(style), { only: "tablet" });
export const fmobile = (style: string) =>
	convertToResponsive(convertCssToObject(style), { only: "mobile" });
export const unresponsive = (style: string) => convertCssToObject(style);
export const keyframes = (...args: Parameters<typeof String.raw>) =>
	restyleKeyframes(convertCssToObject(String.raw(...args)) as KeyframesObject);
