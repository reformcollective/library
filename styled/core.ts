import { style } from "@vanilla-extract/css"
import { addFunctionSerializer } from "@vanilla-extract/css/functionSerializer"

import type { StyledInput, StyledOptions, StyleRules } from "./types"

import { type RuntimeArgs, runtimeStyled } from "./runtime"

// normalize input into a config object
function isStyledOptions(input: StyledInput): input is StyledOptions {
	return (
		typeof input === "object" &&
		input !== null &&
		("base" in input ||
			"variants" in input ||
			"defaults" in input ||
			"defaultVariants" in input ||
			"tokens" in input ||
			"compoundVariants" in input ||
			"compounds" in input) &&
		Object.keys(input).find(
			(key) =>
				key !== "base" &&
				key !== "variants" &&
				key !== "defaults" &&
				key !== "defaultVariants" &&
				key !== "tokens" &&
				key !== "compoundVariants" &&
				key !== "compounds",
		) === undefined
	)
}

function normalizeConfig(input: StyledInput): StyledOptions {
	if (Array.isArray(input)) return { base: input }
	if (isStyledOptions(input)) return input
	return { base: input }
}

// flatten arbitrarily nested arrays into a single-level array
type InfinitelyFlattened<T> = T extends unknown[] ? never : T
function flattenArray<T>(input: T): InfinitelyFlattened<T>[] {
	if (!input) return [] as InfinitelyFlattened<T>[]
	return (Array.isArray(input) ? input : [input]).flat(Infinity as 1) as InfinitelyFlattened<T>[]
}

function classFromStyleRules(input: StyleRules | undefined, debugId?: string) {
	const flatInput = flattenArray(input)
	if (process.env.NODE_ENV === "development") {
		for (const item of flatInput) {
			if (typeof item === "string" && /[;:{]/.test(item)) {
				throw new Error(
					`[styled] Raw CSS string passed as style rules — wrap in f.responsive(), f.unresponsive(), etc.:\n\n"${item}"`,
				)
			}
		}
	}
	return style(flatInput.filter(Boolean), debugId)
}

function processTokens(tokens: StyledOptions["tokens"]) {
	const tokenDefs = []
	for (const [propName, tokenSpec] of Object.entries(tokens ?? {})) {
		const isPrimitive = typeof tokenSpec === "string" || typeof tokenSpec === "number"
		const tokenObj = isPrimitive ? undefined : tokenSpec
		const rawToken = isPrimitive ? String(tokenSpec) : tokenObj?.token
		const unit = tokenObj?.unit
		const token = rawToken
		const trimmed = String(token ?? "").trim()
		const cssVarName = trimmed.startsWith("var(")
			? trimmed.slice(4, -1).trim()
			: trimmed.startsWith("--")
				? trimmed
				: `--${trimmed}`
		tokenDefs.push({ propName, cssVarName, unit })
	}
	return tokenDefs
}

export function styledCore(tag: string, input: StyledInput, debugId?: string) {
	const config = normalizeConfig(input)

	// 1) base: generate classname and collect any plain class strings
	const baseClass = classFromStyleRules(config.base, debugId ? debugId : undefined)

	// 2) variants → classes
	const cvaVariants: Record<string, Record<string, string | null>> = {}
	for (const [variantName, options] of Object.entries(config.variants ?? {})) {
		const compiled: Record<string, string> = {}
		for (const [option, value] of Object.entries(options ?? {})) {
			const vClass = classFromStyleRules(
				value,
				debugId ? `${debugId}_${variantName}_${option}` : undefined,
			)
			compiled[option] = vClass
		}
		cvaVariants[variantName] = compiled
	}

	// 2.1) compoundVariants → classes
	const compounds = config.compoundVariants
		?.map((compound, index) => {
			if (!compound?.base) return compound

			const className = classFromStyleRules(
				compound?.base,
				debugId ? `${debugId}_compound_${index}` : undefined,
			)
			const copy: Record<string, unknown> = { ...compound, className }
			delete copy.base

			return copy
		})
		.filter(Boolean)

	// 3) tokens → runtime tokenDefs
	const tokenDefs = processTokens(config.tokens)

	// 4) build runtime options
	const defaultVariants = config.defaultVariants
	const cvaBase = baseClass
	const cvaOptions: RuntimeArgs["cvaOptions"] = {}
	if (Object.keys(cvaVariants).length > 0) cvaOptions.variants = cvaVariants
	if (defaultVariants) cvaOptions.defaultVariants = defaultVariants
	if (compounds && compounds.length > 0) cvaOptions.compoundVariants = compounds

	const args: RuntimeArgs = { tag, cvaBase, cvaOptions }
	if (tokenDefs.length) args.tokenDefs = tokenDefs

	const Component = runtimeStyled(args)
	addFunctionSerializer(Component, {
		importPath: "library/styled/runtime",
		importName: "runtimeStyled",
		// @ts-expect-error technically the cva type isn't serializable but it's fine for us
		args: [args],
	})
	return Component
}
