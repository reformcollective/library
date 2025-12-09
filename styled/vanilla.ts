import config from "libraryConfig"
import * as csstree from "@eslint/css-tree"
import type { StyleRule } from "@vanilla-extract/css"
import {
	desktopBreakpoint,
	desktopDesignSize,
	mobileBreakpoint,
	mobileDesignSize,
	tabletBreakpoint,
	tabletDesignSize,
} from "styles/media"
import { isBrowser } from "../deviceDetection"
import { isDesktop, isFull, isMobile, isTablet } from "./breakpoints.css"

if (config.stylingSystem === "restyle")
	throw new Error(
		"this project is only configured to use the restyle styling system",
	)

if (isBrowser)
	throw new Error(
		"style system was loaded in the browser! this will explode your bundle size!",
	)

// =============================================================================
// Types
// =============================================================================

type Breakpoint = "mobile" | "tablet" | "desktop" | "fullWidth"
type DesignSize = "mobile" | "tablet" | "desktop"
type BreakpointCombo = "small" | "large" | "all"

type OutputType = "fluid" | "pixel" | "scaleFullyConfig"
type ResponsiveEngine = "calc" | "media"

type BreakpointRule = {
	breakpoint: Breakpoint
	designSize: DesignSize
	output: OutputType
}

type FOptions = {
	engine?: ResponsiveEngine
	scaleFully?: boolean
	designSizeOverride?: {
		desktop?: number
		tablet?: number
		mobile?: number
	}
}

type PxTransform = (px: number) => string

// =============================================================================
// Utilities Config
// =============================================================================

const TABLET_RULE: BreakpointRule =
	config.tabletBreakpoint === "tablet"
		? { breakpoint: "tablet", designSize: "tablet", output: "fluid" }
		: { breakpoint: "tablet", designSize: "mobile", output: "pixel" }

const UTILITIES = {
	responsive: [
		{ breakpoint: "mobile", designSize: "mobile", output: "fluid" },
		TABLET_RULE,
		{ breakpoint: "desktop", designSize: "desktop", output: "fluid" },
		{
			breakpoint: "fullWidth",
			designSize: "desktop",
			output: "scaleFullyConfig",
		},
	],

	scaledResponsive: [
		{ breakpoint: "mobile", designSize: "mobile", output: "fluid" },
		TABLET_RULE,
		{ breakpoint: "desktop", designSize: "desktop", output: "fluid" },
		{ breakpoint: "fullWidth", designSize: "desktop", output: "fluid" },
	],

	large: [
		{ breakpoint: "desktop", designSize: "desktop", output: "fluid" },
		{
			breakpoint: "fullWidth",
			designSize: "desktop",
			output: "scaleFullyConfig",
		},
	],

	small: [
		{ breakpoint: "mobile", designSize: "mobile", output: "fluid" },
		TABLET_RULE,
	],

	fullWidth: [
		{
			breakpoint: "fullWidth",
			designSize: "desktop",
			output: "scaleFullyConfig",
		},
	],

	desktop: [{ breakpoint: "desktop", designSize: "desktop", output: "fluid" }],

	tablet: [TABLET_RULE],

	mobile: [{ breakpoint: "mobile", designSize: "mobile", output: "fluid" }],

	allFullWidth: [
		{ breakpoint: "mobile", designSize: "desktop", output: "scaleFullyConfig" },
		{ breakpoint: "tablet", designSize: "desktop", output: "scaleFullyConfig" },
		{
			breakpoint: "desktop",
			designSize: "desktop",
			output: "scaleFullyConfig",
		},
		{
			breakpoint: "fullWidth",
			designSize: "desktop",
			output: "scaleFullyConfig",
		},
	],

	allDesktop: [
		{ breakpoint: "mobile", designSize: "desktop", output: "fluid" },
		{ breakpoint: "tablet", designSize: "desktop", output: "fluid" },
		{ breakpoint: "desktop", designSize: "desktop", output: "fluid" },
		{ breakpoint: "fullWidth", designSize: "desktop", output: "fluid" },
	],

	allTablet: [
		{ ...TABLET_RULE, breakpoint: "mobile" },
		{ ...TABLET_RULE, breakpoint: "tablet" },
		{ ...TABLET_RULE, breakpoint: "desktop" },
		{ ...TABLET_RULE, breakpoint: "fullWidth" },
	],

	allMobile: [
		{ breakpoint: "mobile", designSize: "mobile", output: "fluid" },
		{ breakpoint: "tablet", designSize: "mobile", output: "fluid" },
		{ breakpoint: "desktop", designSize: "mobile", output: "fluid" },
		{ breakpoint: "fullWidth", designSize: "mobile", output: "fluid" },
	],
} satisfies Record<string, BreakpointRule[]>

// =============================================================================
// Config
// =============================================================================

/**
 * decimal precision for generated vw values
 */
const VW_PRECISION = 3
/**
 * decimal precision for generated px values
 */
const PIXEL_PRECISION = 2
/**
 * responsive engine to use
 */
const DEFAULT_ENGINE: ResponsiveEngine = config.vanillaExtractEngine

// =============================================================================
// Internal Constants
// =============================================================================

let hash = 0
const getInjectionKey = () => `--s-${hash++}`

const DESIGN_SIZE: Record<DesignSize, number> = {
	mobile: mobileDesignSize,
	tablet: tabletDesignSize,
	desktop: desktopDesignSize,
}

const BREAKPOINT_MIN: Record<Breakpoint, number> = {
	mobile: mobileBreakpoint,
	tablet: mobileBreakpoint + 1,
	desktop: tabletBreakpoint + 1,
	fullWidth: desktopBreakpoint + 1,
}

const MEDIA_QUERIES: Record<Breakpoint, string> = {
	mobile: `screen and (max-width: ${mobileBreakpoint}px)`,
	tablet: `screen and (min-width: ${BREAKPOINT_MIN.tablet}px) and (max-width: ${tabletBreakpoint}px)`,
	desktop: `screen and (min-width: ${BREAKPOINT_MIN.desktop}px) and (max-width: ${desktopBreakpoint}px)`,
	fullWidth: `screen and (min-width: ${BREAKPOINT_MIN.fullWidth}px)`,
}

const COMBO_MEDIA_QUERIES: Record<"small" | "large", string> = {
	small: `screen and (max-width: ${tabletBreakpoint}px)`,
	large: `screen and (min-width: ${BREAKPOINT_MIN.desktop}px)`,
}

const CSS_VARS: Record<Breakpoint, string> = {
	mobile: isMobile,
	tablet: isTablet,
	desktop: isDesktop,
	fullWidth: isFull,
}

// =============================================================================
// Shared Helpers
// =============================================================================

const getDesignSize = (size: DesignSize, options?: FOptions): number =>
	options?.designSizeOverride?.[size] ?? DESIGN_SIZE[size]

const toVw = (px: number, designSize: number): string =>
	`${((px / designSize) * 100).toFixed(VW_PRECISION)}vw`

const toPx = (
	px: number,
	designSize: number,
	breakpoint: Breakpoint,
): string => {
	const minWidth = BREAKPOINT_MIN[breakpoint]
	const scaled = (px / designSize) * minWidth
	const str = scaled.toFixed(PIXEL_PRECISION)
	return `${str}px`.replace(".00px", "px")
}

const computeResponsiveValue = (
	px: number,
	rule: BreakpointRule,
	options?: FOptions,
): string => {
	const designSize = getDesignSize(rule.designSize, options)

	switch (rule.output) {
		case "fluid":
			return toVw(px, designSize)
		case "pixel":
			return toPx(px, designSize, rule.breakpoint)
		case "scaleFullyConfig": {
			const shouldScale = options?.scaleFully ?? config.scaleFully
			return shouldScale
				? toVw(px, designSize)
				: toPx(px, designSize, rule.breakpoint)
		}
	}
}

const getBreakpointCombo = (
	rules: BreakpointRule[],
): BreakpointCombo | null => {
	const breakpoints = new Set(rules.map((r) => r.breakpoint))
	if (breakpoints.size === 4) return "all"
	if (breakpoints.size === 2) {
		if (breakpoints.has("mobile") && breakpoints.has("tablet")) return "small"
		if (breakpoints.has("desktop") && breakpoints.has("fullWidth"))
			return "large"
	}
	return null
}

const hasUniformOutput = (rules: BreakpointRule[]): boolean =>
	rules.every(
		(r) =>
			r.designSize === rules[0]?.designSize && r.output === rules[0]?.output,
	)

const pixelRegex = /\d+(\.\d+)?px/g

const replacePxInAst = (
	root: csstree.CssNode,
	transform: PxTransform,
): void => {
	csstree.walk(root, {
		visit: "Declaration",
		enter(node, item, list) {
			if (node.type !== "Declaration") return
			const nodeValueAsString = csstree.generate(node.value)
			const newValue = nodeValueAsString.replaceAll(pixelRegex, (match) =>
				transform(Number.parseFloat(match)),
			)

			if (newValue !== nodeValueAsString) {
				// manually replacing the value
				node.value = {
					type: "Raw",
					value: newValue,
				}
			}
		},
	})
}

const parseWrappedCss = (cssText: string): csstree.CssNode | null => {
	try {
		return csstree.parse(`x{${cssText}}`)
	} catch (error) {
		console.error("error parsing css:", error)
		return null
	}
}

const unwrapGeneratedCss = (generated: string): string => generated.slice(2, -1)

const toInjectedStyleRule = (cssText: string) =>
	({
		[getInjectionKey()]: `ignored;${cssText}`,
	}) as unknown as StyleRule

// =============================================================================
// Calc Engine
// =============================================================================

const getCalcExpression = (
	px: number,
	rules: BreakpointRule[],
	options?: FOptions,
): string => {
	const uniform = hasUniformOutput(rules)

	if (uniform && rules[0]) {
		return computeResponsiveValue(px, rules[0], options)
	}

	const terms = rules.map((rule) => {
		const value = computeResponsiveValue(px, rule, options)
		return `(${value}) * ${CSS_VARS[rule.breakpoint]}`
	})
	return `calc(${terms.join(" + ")})`
}

const wrapWithMediaQueries = (
	cssText: string,
	rules: BreakpointRule[],
): string => {
	const combo = getBreakpointCombo(rules)

	if (combo === "all") return cssText

	if (combo === "small" || combo === "large") {
		return `@media ${COMBO_MEDIA_QUERIES[combo]}{${cssText}}`
	}

	const uniqueBreakpoints = [...new Set(rules.map((r) => r.breakpoint))]
	return uniqueBreakpoints
		.map((bp) => `@media ${MEDIA_QUERIES[bp]}{${cssText}}`)
		.join("")
}

const calcEngine = (
	cssText: string,
	rules: BreakpointRule[],
	options?: FOptions,
): string => {
	const ast = parseWrappedCss(cssText)
	if (!ast) return cssText

	replacePxInAst(ast, (px) => getCalcExpression(px, rules, options))
	const processed = unwrapGeneratedCss(csstree.generate(ast))
	return wrapWithMediaQueries(processed, rules)
}

// =============================================================================
// Media Engine
// =============================================================================

const mediaEngine = (
	cssText: string,
	rules: BreakpointRule[],
	options?: FOptions,
): string => {
	const ast = parseWrappedCss(cssText)
	if (!ast) return cssText

	const contents: string[] = []
	for (const rule of rules) {
		const cloned = csstree.clone(ast)
		replacePxInAst(cloned, (px) => computeResponsiveValue(px, rule, options))
		contents.push(unwrapGeneratedCss(csstree.generate(cloned)))
	}

	const allIdentical =
		contents.length > 0 && contents.every((c) => c === contents[0])
	if (allIdentical && getBreakpointCombo(rules) === "all") {
		return contents[0] ?? ""
	}

	return rules
		.map(
			(rule, i) => `@media ${MEDIA_QUERIES[rule.breakpoint]}{${contents[i]}}`,
		)
		.join("")
}

// =============================================================================
// Style Generation
// =============================================================================

const generateStyle = (
	cssText: string,
	rules: BreakpointRule[],
	options?: FOptions,
): StyleRule => {
	const engine = options?.engine ?? DEFAULT_ENGINE
	const processed =
		engine === "calc"
			? calcEngine(cssText, rules, options)
			: mediaEngine(cssText, rules, options)
	return toInjectedStyleRule(processed)
}

const unresponsive = (cssText: string): StyleRule =>
	toInjectedStyleRule(cssText)

// =============================================================================
// Public API
// =============================================================================

type UtilityFn = (cssText: string, options?: FOptions) => StyleRule

type FApi = {
	[K in keyof typeof UTILITIES]: UtilityFn
} & {
	unresponsive: (cssText: string) => StyleRule
}

export const f = Object.fromEntries(
	Object.entries(UTILITIES).map(([name, rules]) => [
		name,
		(cssText: string, options?: FOptions) =>
			generateStyle(cssText, rules, options),
	]),
) as FApi

f.unresponsive = unresponsive

export const fresponsive = f.responsive
export const ftablet = f.tablet
export const fmobile = f.mobile
export { unresponsive }
