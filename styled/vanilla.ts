import config from "libraryConfig"
import {
	type StyleRule,
	keyframes as vanillaKeyframes,
} from "@vanilla-extract/css"
import { type ComponentType, createElement } from "react"
import {
	desktopBreakpoint,
	desktopDesignSize,
	mobileBreakpoint,
	mobileDesignSize,
	tabletBreakpoint,
	tabletDesignSize,
} from "styles/media"
import { COMMENT, compile, DECLARATION, type Element, RULESET } from "stylis"
import { isDesktop, isFull, isMobile, isTablet } from "./breakpoints.css"

export type CSSObject = StyleRule
export type CSSValue = string | number | StyleRule

export function attrs<Props>(
	Component: ComponentType<Props>,
	addedProps: Partial<Props>,
) {
	return (props: Props) =>
		createElement(
			Component as ComponentType<unknown>,
			{
				...addedProps,
				...props,
			} as Record<string, unknown>,
		)
}

// Re-exports and helpers from the combined module
export const px = (n: number) => `${n}px`
export const vw = (n: number) => `${n}vw`
export const switchValue4 = (
	mobile: string,
	tablet: string,
	desktop: string,
	full: string,
) =>
	`calc((${mobile}) * ${isMobile} + (${tablet}) * ${isTablet} + (${desktop}) * ${isDesktop} + (${full}) * ${isFull})`

const toCamel = (prop: string) =>
	prop.startsWith("--")
		? prop
		: prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

type MutableStyle = Record<string, unknown> & {
	selectors?: Record<string, MutableStyle>
	"@media"?: Record<string, MutableStyle>
	"@supports"?: Record<string, MutableStyle>
	"@container"?: Record<string, MutableStyle>
	"@layer"?: Record<string, MutableStyle>
}

const convert = (elements: Element[]): MutableStyle => {
	const style: MutableStyle = {}
	for (const el of elements) {
		if (el.type === COMMENT) continue
		if (el.type === DECLARATION) {
			if (Array.isArray(el.props)) continue
			style[toCamel(String(el.props))] = String(el.children)
			continue
		}
		if (el.type === RULESET) {
			if (!Array.isArray(el.children)) continue
			const sel = String(el.value || el.props).replaceAll("\f", "")
			style.selectors ||= {}
			style.selectors[sel] = convert(el.children)
			continue
		}
		if (typeof el.type === "string" && el.type.startsWith("@")) {
			if (!Array.isArray(el.children)) continue
			const name = Array.isArray(el.props)
				? String(el.props[0] ?? "")
				: String((el.props as string) ?? el.value ?? "")
			if (el.type === "@media") {
				style["@media"] ||= {}
				style["@media"][name] = convert(el.children)
				continue
			}
			if (el.type === "@supports") {
				style["@supports"] ||= {}
				style["@supports"][name] = convert(el.children)
				continue
			}
			if (el.type === "@container") {
				style["@container"] ||= {}
				style["@container"][name] = convert(el.children)
				continue
			}
			if (el.type === "@layer") {
				style["@layer"] ||= {}
				style["@layer"][name] = convert(el.children)
			}
			// ignore other at-rules for this POC
		}
	}
	return style
}

export const css = String.raw

const compileCssText = (content: string): StyleRule =>
	convert(compile(content)) as unknown as StyleRule

const fromTemplate = (
	tpl: TemplateStringsArray,
	values: Array<string | number>,
): StyleRule => compileCssText(String.raw(tpl, ...values))

const isTemplate = (v: unknown): v is TemplateStringsArray =>
	Array.isArray(v) && Object.hasOwn(v, "raw")

const isStringOrNumber = (value: unknown): value is string | number =>
	typeof value === "string" || typeof value === "number"

const resolveStyleRule = (
	input: TemplateStringsArray | string | StyleRule,
	optionsOrExpr: unknown,
	expr: Array<string | number>,
	hasOptions: boolean,
): StyleRule => {
	if (isTemplate(input))
		return fromTemplate(
			input,
			(hasOptions ? expr : [optionsOrExpr, ...expr]).filter(isStringOrNumber),
		)
	if (typeof input === "string") return compileCssText(input)
	return input as StyleRule
}

export const unresponsive = (
	input: TemplateStringsArray | string | StyleRule,
	...expr: Array<string | number>
): StyleRule =>
	isTemplate(input)
		? normalizeSelectorsOnly(fromTemplate(input, expr))
		: typeof input === "string"
			? normalizeSelectorsOnly(compileCssText(input))
			: normalizeSelectorsOnly(input as StyleRule)

export const keyframes = (
	tpl: TemplateStringsArray,
	...expr: Array<string | number>
) => {
	const rule = fromTemplate(tpl, expr)
	const selectors = (rule as Record<string, unknown>).selectors as
		| Record<string, StyleRule>
		| undefined
	if (!selectors)
		throw new Error(
			"keyframes template must contain at least one frame selector",
		)
	return vanillaKeyframes(selectors)
}

const normalizeSelectorsOnly = (rule: StyleRule): StyleRule => {
	const out: Record<string, unknown> = {}
	for (const [key, val] of Object.entries(rule as Record<string, unknown>)) {
		if (key === "selectors") {
			const nested: Record<string, unknown> = {}
			for (const [rawSel, child] of Object.entries(
				val as Record<string, unknown>,
			)) {
				let sel = String(rawSel).trim()
				if (sel.startsWith(":")) sel = `&${sel}`
				sel = sel.replace(/&\s*([>+~])\s*/g, "& $1 ")
				nested[sel] = normalizeSelectorsOnly(child as StyleRule)
			}
			out.selectors = nested
			continue
		}
		if (
			key === "@media" ||
			key === "@supports" ||
			key === "@container" ||
			key === "@layer"
		) {
			const nested: Record<string, unknown> = {}
			for (const [k, child] of Object.entries(val as Record<string, unknown>)) {
				nested[k] = normalizeSelectorsOnly(child as StyleRule)
			}
			out[key] = nested
			continue
		}
		if (typeof val === "object" && val) {
			out[key] = normalizeSelectorsOnly(val as StyleRule)
		} else {
			out[key] = val
		}
	}
	return out as StyleRule
}

const VW_PRECISION = 3
const PIXEL_PRECISION = 2
const pxRegex = /(-?\d*\.?\d+)px\b/g

const toVw = (px: number, design: number) =>
	`${((px / design) * 100).toFixed(VW_PRECISION)}vw`
const toPxString = (val: number) => {
	const out = val.toFixed(PIXEL_PRECISION)
	return `${out}px`.replace(".00px", "px")
}
const toFull = (
	px: number,
	desktopSize: number,
	overrideScaleFully?: boolean,
) => {
	const useScale = overrideScaleFully ?? config.scaleFully
	if (useScale) return toVw(px, desktopSize)
	const val = (px * desktopBreakpoint) / desktopSize
	return toPxString(val)
}

const toLargeMobilePx = (px: number, mobileSize: number) => {
	const val = (px / mobileSize) * mobileBreakpoint
	return toPxString(val)
}

type FMode =
	| "responsive"
	| "scaledResponsive"
	| "large"
	| "small"
	| "fullWidth"
	| "desktop"
	| "tablet"
	| "mobile"
	| "allFullWidth"
	| "allDesktop"
	| "allTablet"
	| "allMobile"

type FOptions = {
	only?: "mobile" | "tablet" | "desktop" | "fullWidth"
	scaleFully?: boolean
	applyStylesToAllBreakpoints?: boolean
	designSizeOverride?: {
		desktop?: number
		tablet?: number
		mobile?: number
	}
}

const computeTerms = (px: number, mode: FMode, options?: FOptions) => {
	const original = `${px}px`
	const mobileSize = options?.designSizeOverride?.mobile ?? mobileDesignSize
	const tabletSize = options?.designSizeOverride?.tablet ?? tabletDesignSize
	const desktopSize = options?.designSizeOverride?.desktop ?? desktopDesignSize
	const forceScaleFully = options?.scaleFully ?? mode === "scaledResponsive"

	const m = toVw(px, mobileSize)
	const t =
		config.tabletBreakpoint === "tablet"
			? toVw(px, tabletSize)
			: toLargeMobilePx(px, mobileSize)
	const d = toVw(px, desktopSize)
	const f = toFull(px, desktopSize, forceScaleFully)
	return { original, m, t, d, f }
}

const replacePxWithSwitchers = (
	value: string,
	mode: FMode,
	options?: FOptions,
): string =>
	value.replace(pxRegex, (_, n: string) => {
		const num = Number.parseFloat(n)
		const { original, m, t, d, f } = computeTerms(num, mode, options)
		switch (mode) {
			case "responsive":
			case "scaledResponsive":
				return switchValue4(m, t, d, f)
			case "large":
				return switchValue4(original, original, d, f)
			case "small":
				return switchValue4(m, t, original, original)
			case "fullWidth":
				// single-target bucket: direct value, no switching
				return f
			case "desktop":
				return d
			case "tablet":
				return t
			case "mobile":
				return m
			case "allFullWidth":
				// same value for all breakpoints: avoid switcher
				return f
			case "allDesktop":
				return d
			case "allTablet":
				return t
			case "allMobile":
				return m
		}
	})

const transformStyleRule = (
	rule: StyleRule,
	mode: FMode,
	options?: FOptions,
): StyleRule => {
	const out: Record<string, unknown> = {}
	for (const [key, val] of Object.entries(rule as Record<string, unknown>)) {
		if (key === "selectors") {
			const nested: Record<string, unknown> = {}
			for (const [rawSel, child] of Object.entries(
				val as Record<string, unknown>,
			)) {
				let sel = String(rawSel).trim()
				// ensure self-targeting pseudos/elements are anchored
				if (sel.startsWith(":")) sel = `&${sel}`
				// normalize awkward child/sibling combinator spacing like "&>*" → "& > *"
				sel = sel.replace(/&\s*([>+~])\s*/g, "& $1 ")
				nested[sel] = transformStyleRule(child as StyleRule, mode, options)
			}
			out.selectors = nested
			continue
		}
		if (
			key === "@media" ||
			key === "@supports" ||
			key === "@container" ||
			key === "@layer"
		) {
			const nested: Record<string, unknown> = {}
			for (const [k, child] of Object.entries(val as Record<string, unknown>)) {
				nested[k] = transformStyleRule(child as StyleRule, mode, options)
			}
			out[key] = nested
			continue
		}
		if (Array.isArray(val)) {
			out[key] = (val as Array<string | number>).map((v) =>
				typeof v === "string" ? replacePxWithSwitchers(v, mode, options) : v,
			)
		} else if (typeof val === "object" && val) {
			out[key] = transformStyleRule(val as StyleRule, mode, options)
		} else if (typeof val === "string") {
			out[key] = replacePxWithSwitchers(val, mode, options)
		} else {
			out[key] = val
		}
	}
	return out as StyleRule
}

const resolveMode = (base: FMode, options?: FOptions): FMode => {
	if (!options) return base
	let mode = base
	if (options.only) {
		switch (options.only) {
			case "mobile":
				mode = "mobile"
				break
			case "tablet":
				mode = "tablet"
				break
			case "desktop":
				mode = "desktop"
				break
			case "fullWidth":
				mode = "fullWidth"
				break
		}
	}
	if (options.applyStylesToAllBreakpoints && options.only) {
		switch (options.only) {
			case "mobile":
				mode = "allMobile"
				break
			case "tablet":
				mode = "allTablet"
				break
			case "desktop":
				mode = "allDesktop"
				break
			case "fullWidth":
				mode = "allFullWidth"
				break
		}
	}
	return mode
}

const getMediaQueryForMode = (mode: FMode): string | null => {
	// gate modes that target a subset of breakpoints
	switch (mode) {
		case "mobile":
			return `screen and (max-width: ${mobileBreakpoint}px)`
		case "tablet":
			return `screen and (min-width: ${mobileBreakpoint + 1}px) and (max-width: ${tabletBreakpoint}px)`
		case "desktop":
			return `screen and (min-width: ${tabletBreakpoint + 1}px) and (max-width: ${desktopBreakpoint}px)`
		case "fullWidth":
			return `screen and (min-width: ${desktopBreakpoint + 1}px)`
		case "small":
			// mobile + tablet combined
			return `screen and (max-width: ${tabletBreakpoint}px)`
		case "large":
			// desktop + fullWidth combined
			return `screen and (min-width: ${tabletBreakpoint + 1}px)`
		default:
			return null
	}
}

const wrapWithMedia = (rule: StyleRule, query: string | null): StyleRule => {
	if (!query) return rule
	return { "@media": { [query]: rule } } as StyleRule
}

export const f = {
	responsive: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("responsive", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	scaledResponsive: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("scaledResponsive", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	large: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("large", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	small: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("small", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	fullWidth: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("fullWidth", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	desktop: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("desktop", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	tablet: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("tablet", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	mobile: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("mobile", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	allFullWidth: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("allFullWidth", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	allDesktop: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("allDesktop", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	allTablet: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("allTablet", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	allMobile: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		optionsOrExpr?: FOptions | string | number,
		...expr: Array<string | number>
	): StyleRule => {
		const hasOptions =
			typeof optionsOrExpr === "object" &&
			optionsOrExpr !== null &&
			!Array.isArray(optionsOrExpr)
		const options = hasOptions ? (optionsOrExpr as FOptions) : undefined
		const base = resolveStyleRule(tplOrRule, optionsOrExpr, expr, hasOptions)
		const mode = resolveMode("allMobile", options)
		const transformed = transformStyleRule(base, mode, options)
		return wrapWithMedia(transformed, getMediaQueryForMode(mode))
	},
	unresponsive: (
		tplOrRule: TemplateStringsArray | string | StyleRule,
		...expr: Array<string | number>
	): StyleRule => unresponsive(tplOrRule, ...expr),
}

export const fresponsive = f.responsive
export const ftablet = f.tablet
export const fmobile = f.mobile
