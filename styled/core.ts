import { globalStyle, style } from "@vanilla-extract/css"
import { addFunctionSerializer } from "@vanilla-extract/css/functionSerializer"
import { type RuntimeArgs, runtimeStyled } from "./runtime"
import type {
	StyledInput,
	StyledOptions,
	StyleRules,
	WithinBlock,
	WithinRule,
} from "./types"

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
			"within" in input ||
			"compoundVariants" in input ||
			"compounds" in input) &&
		Object.keys(input).find(
			(key) =>
				key !== "base" &&
				key !== "variants" &&
				key !== "defaults" &&
				key !== "defaultVariants" &&
				key !== "tokens" &&
				key !== "within" &&
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
	return (Array.isArray(input) ? input : [input]).flat(
		Infinity as 1,
	) as InfinitelyFlattened<T>[]
}

// pull any `within` blocks off a style object (non-destructive)
function extractWithinFromObject(rule: WithinRule) {
	return rule.within
}

// remove `within` from a style object (non-destructive)
function stripWithin(rule: WithinRule): Exclude<WithinRule, "within"> {
	const out = {}
	for (const [k, v] of Object.entries(rule || {})) {
		if (k === "within") continue
		// @ts-expect-error - we know k is a string
		out[k] = v
	}
	return out
}

function normalizeWithinSelector(rootSelector: string, key: string) {
	const trimmed = String(key ?? "").trim()
	if (!trimmed) return rootSelector
	// replace ALL occurrences of '&' with the root selector (not just leading)
	if (trimmed.includes("&")) return trimmed.replaceAll("&", rootSelector)
	// pseudo starting tokens should attach to root without a space
	if (trimmed.startsWith(":")) return `${rootSelector}${trimmed}`
	// default: scope the selector under the root with a space
	return `${rootSelector} ${trimmed}`
}

function emitWithin(anchorClass: string, entries?: WithinBlock) {
	if (!entries) return

	for (const [rawKey, rawStyle] of Object.entries(entries)) {
		const selector = normalizeWithinSelector(anchorClass, rawKey)
		for (const block of flattenArray(rawStyle)) {
			if (!block) continue
			globalStyle(selector, block)
		}
	}
}

// generate a classname from StyleRules and emit any `within` blocks as global styles
function classFromStyleRules(input: StyleRules | undefined, debugId?: string) {
	const flatInput = flattenArray(input)
	const className = style(
		// @ts-expect-error - within will be removed soon so I don't care
		flatInput
			.map((x) => (typeof x === "object" ? stripWithin(x) : x))
			.filter(Boolean),
		debugId,
	)

	const withinBlocks = flatInput
		.filter((x) => typeof x === "object")
		.map(extractWithinFromObject)
	for (const block of withinBlocks) {
		emitWithin(className, block)
	}

	return className
}

function processTokens(tokens: StyledOptions["tokens"]) {
	const tokenDefs = []
	for (const [propName, tokenSpec] of Object.entries(tokens ?? {})) {
		const isPrimitive =
			typeof tokenSpec === "string" || typeof tokenSpec === "number"
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
	const baseClass = classFromStyleRules(
		config.base,
		debugId ? debugId : undefined,
	)
	if (config.within) emitWithin(baseClass, config.within)

	// 2) variants → classes + emit variant-level within anchored to base + variant
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

	// 2.1) compoundVariants → classes + emit compound-level within anchored to base + variant
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
