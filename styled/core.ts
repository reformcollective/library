import {
	type ComplexStyleRule,
	globalStyle,
	type StyleRule,
	style,
} from "@vanilla-extract/css"
import { addFunctionSerializer } from "@vanilla-extract/css/functionSerializer"
import { type RuntimeArgs, runtimeStyled } from "./runtime"
import type { StyledConfig, StyledOptions } from "./types"

function isStyledOptions(
	input: ComplexStyleRule | StyledOptions,
): input is StyledOptions {
	return (
		typeof input === "object" &&
		input !== null &&
		("base" in input ||
			"variants" in input ||
			"defaults" in input ||
			"defaultVariants" in input ||
			"vars" in input ||
			"within" in input ||
			"compoundVariants" in input ||
			"compounds" in input) &&
		Object.keys(input).find(
			(key) =>
				key !== "base" &&
				key !== "variants" &&
				key !== "defaults" &&
				key !== "defaultVariants" &&
				key !== "vars" &&
				key !== "within" &&
				key !== "compoundVariants" &&
				key !== "compounds",
		) === undefined
	)
}

function normalizeConfig(input: StyledConfig = {}) {
	return Array.isArray(input)
		? { base: input }
		: isStyledOptions(input)
			? input
			: { base: input }
}

// flatten arbitrarily nested arrays into a single-level array
function flattenArray<T>(input: T | T[] | (T | T[])[] | undefined | null): T[] {
	if (!input) return []
	return (Array.isArray(input) ? input : [input]).flat(Infinity as 1) as T[]
}

// compile a mixture of VE style objects and/or class strings into a single class string
function compileToClass(
	blocks: Array<StyleRule | string | null | undefined>,
): string {
	const out: string[] = []
	for (const b of blocks) {
		if (!b) continue
		if (typeof b === "string") {
			out.push(b)
		} else {
			out.push(style(b))
		}
	}
	return out.join(" ")
}

export function styledCore(tag: string, config: StyledConfig) {
	const cfg = normalizeConfig(config)

	// base compilation (accept style objects, arrays, and/or class strings)
	const rawBase = (cfg as any).base as unknown
	const baseBlocks = flattenArray<StyleRule | string>(rawBase as any)
	let baseClass = compileToClass(baseBlocks)
	// ensure a base anchor when base-level within exists but no base class
	if (!baseClass && (cfg as any)?.within) {
		baseClass = style({}, "styled_base_marker")
	}

	// helper: split classes for anchoring selectors
	const splitClasses = (cls: string) => cls.split(" ").filter(Boolean)
	const baseClassParts = splitClasses(baseClass)

	// dev guard: avoid confusion with VE selectors API
	if ((cfg as any)?.selectors && process.env.NODE_ENV !== "production") {
		console.warn(
			"[styled] `selectors` found in config. Use `within` for scoped descendant styles.",
		)
	}

	// normalize selector relative to root
	function normalizeWithinSelector(rootSelector: string, key: string) {
		const trimmed = String(key ?? "").trim()
		if (!trimmed) return rootSelector
		if (trimmed.startsWith("&")) return trimmed.replace(/&/g, rootSelector)
		// pseudo without '&' is ambiguous; enforce '&' in dev, auto-correct to self in prod
		if (trimmed.startsWith(":") || trimmed.startsWith("::")) {
			if (process.env.NODE_ENV !== "production") {
				throw new Error(
					`[styled.within] pseudo selector "${trimmed}" must start with '&'. use "&${trimmed}"`,
				)
			}
			// production: assume self pseudo to avoid accidental descendant leak
			return `${rootSelector}${trimmed}`
		}
		return `${rootSelector} ${trimmed}`
	}

	function warnIfNested(styleObj: Record<string, any>) {
		if (process.env.NODE_ENV === "production" || !styleObj) return
		for (const k of Object.keys(styleObj)) {
			if (
				k === "selectors" ||
				k.includes("&") ||
				k.includes(":") ||
				k.includes(" ") ||
				k.includes(">") ||
				k.includes("+") ||
				k.includes("~")
			) {
				console.warn(
					`[styled.within] Nested selector-like key "${k}" found inside style object. Move selectors to the 'within' map.`,
				)
				break
			}
		}
	}

	function emitWithinStyles(
		anchorClasses: string[],
		entries?: Record<string, any>,
	) {
		if (!entries) return
		const rootSelector = "." + anchorClasses.filter(Boolean).join(".")
		for (const [rawKey, rawStyle] of Object.entries(entries)) {
			const selector = normalizeWithinSelector(rootSelector, rawKey)
			const blocks = Array.isArray(rawStyle) ? rawStyle : [rawStyle]
			for (const block of blocks) {
				if (!block) continue
				warnIfNested(block as any)
				globalStyle(selector, block as any)
			}
		}
	}

	// build CVA-compatible options by compiling VE style objects to classes
	const cvaVariants: Record<string, Record<string, string | null>> = {}
	for (const [variantName, options] of Object.entries(
		((cfg as any).variants ?? {}) as Record<string, any>,
	)) {
		const compiled: Record<string, string | null> = {}
		for (const [option, value] of Object.entries(options ?? {})) {
			let withinEntries: Record<string, any> | undefined
			let cls = ""
			if (value == null) {
				cls = ""
			} else if (typeof value === "string") {
				cls = value
			} else if (Array.isArray(value)) {
				cls = compileToClass(value as Array<StyleRule | string>)
			} else if (
				typeof value === "object" &&
				("base" in (value as any) || "within" in (value as any))
			) {
				const baseBlocks = flattenArray<StyleRule | string>((value as any).base)
				cls = compileToClass(baseBlocks)
				withinEntries = (value as any).within
			} else {
				// assume VE style object
				cls = compileToClass([value as StyleRule])
			}

			if (withinEntries) {
				// ensure option anchor exists
				if (!cls)
					cls = style({}, `styled_variant_marker_${variantName}_${option}`)
				const parts = splitClasses(cls)
				emitWithinStyles([...baseClassParts, ...parts], withinEntries)
			}

			compiled[option] = cls || null
		}
		cvaVariants[variantName] = compiled
	}

	// base-level within
	if ((cfg as any)?.within) {
		emitWithinStyles(baseClassParts, (cfg as any).within as Record<string, any>)
	}

	// compound variants: compile class and emit compound-level within
	const rawCompounds: any[] = Array.isArray((cfg as any)?.compoundVariants)
		? (cfg as any).compoundVariants
		: Array.isArray((cfg as any)?.compounds)
			? (cfg as any).compounds
			: []
	const cvaCompounds: Array<Record<string, any>> = []
	for (const raw of rawCompounds) {
		if (!raw || typeof raw !== "object") continue
		const {
			base: compoundBase,
			class: classProp,
			className,
			within: compoundWithin,
			...conditions
		} = raw as any
		const baseBlocks = flattenArray<StyleRule | string>(compoundBase)
		const compiledBase = compileToClass(baseBlocks)
		const compiledClassProp = Array.isArray(classProp)
			? compileToClass(classProp as Array<StyleRule | string>)
			: typeof classProp === "string"
				? classProp
				: typeof classProp === "object" && classProp
					? compileToClass([classProp as StyleRule])
					: ""
		const compiledClassName = Array.isArray(className)
			? compileToClass(className as Array<StyleRule | string>)
			: typeof className === "string"
				? className
				: typeof className === "object" && className
					? compileToClass([className as StyleRule])
					: ""

		let compoundClass = compileToClass(
			[compiledBase, compiledClassProp, compiledClassName].filter(
				Boolean,
			) as string[],
		)
		if (!compoundClass) compoundClass = style({}, "styled_compound_marker")
		if (compoundWithin) {
			const compParts = splitClasses(compoundClass)
			emitWithinStyles([...baseClassParts, ...compParts], compoundWithin as any)
		}
		cvaCompounds.push({ ...conditions, class: compoundClass })
	}

	// normalize vars to runtime-friendly defs
	const rawVarTokens = ((cfg as any).vars ?? {}) as Record<
		string,
		string | { token: string; unit?: string }
	>
	const varDefs: Array<{
		propName: string
		cssVarName: string
		unit?: string
	}> = []
	for (const [propName, tokenSpec] of Object.entries(rawVarTokens)) {
		const { token: rawName, unit } =
			typeof tokenSpec === "string"
				? { token: tokenSpec, unit: undefined }
				: tokenSpec
		const trimmed = (rawName ?? "").trim()
		const cssVarName = trimmed.startsWith("var(")
			? trimmed.slice(4, -1).trim()
			: trimmed.startsWith("--")
				? trimmed
				: `--${trimmed}`
		varDefs.push({ propName, cssVarName, unit })
	}

	// build CVA options
	const defaultVariants = (cfg as any).defaultVariants ?? (cfg as any).defaults
	const cvaBase: string | string[] = baseClass
	const cvaOptions: Record<string, unknown> = {
		variants: cvaVariants,
		...(cvaCompounds.length ? { compoundVariants: cvaCompounds } : {}),
		...(defaultVariants ? { defaultVariants } : {}),
	}

	const args: RuntimeArgs = {
		tag,
		cvaBase,
		cvaOptions,
	}
	if (varDefs.length) args.varDefs = varDefs

	const Component = runtimeStyled(args)
	addFunctionSerializer(Component, {
		importPath: "library/styled/runtime",
		importName: "runtimeStyled",
		args: [args as any],
	})
	return Component
}
