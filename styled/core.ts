import { globalStyle, style } from "@vanilla-extract/css"
import { addFunctionSerializer } from "@vanilla-extract/css/functionSerializer"
import { runtimeStyled, type RuntimeArgs } from "./runtime"

type SerializableStyle = Record<string, unknown>

export type StyledConfig =
	| (SerializableStyle | SerializableStyle[])
	| {
			base?: (SerializableStyle | SerializableStyle[])[]
			variants?: Record<
				string,
				Record<string, (SerializableStyle | SerializableStyle[])[]>
			>
			defaults?: Record<string, string | boolean>
			vars?: Record<string, string | { token: string; unit?: string }>
	  }

function flatten(input?: (SerializableStyle | SerializableStyle[])[]) {
	const out: SerializableStyle[] = []
	for (const entry of input ?? []) {
		if (!entry) continue
		if (Array.isArray(entry)) out.push(...entry)
		else out.push(entry)
	}
	return out
}

export function styledCore(tag: string, config: StyledConfig) {
	function normalizeConfig(input: StyledConfig) {
		if (!input || (Array.isArray(input) && input.length === 0)) {
			if (process.env.NODE_ENV !== "production") {
				throw new Error(
					"[styled] config is required; pass an array of style objects or a config object",
				)
			}
			return { base: [] as SerializableStyle[] } as any
		}
		return Array.isArray(input) ? ({ base: input } as any) : (input as any)
	}

	const cfg = normalizeConfig(config)

	const base = flatten((cfg as any).base as any)
	let baseClass = base.map((b) => style(b)).join(" ")

	if (!baseClass && (cfg as any)?.within) {
		baseClass = style({}, "styled_base_marker")
	}

	const splitClasses = (cls: string) => cls.split(" ").filter(Boolean)
	const baseClassParts = splitClasses(baseClass)

	if ((cfg as any)?.selectors && process.env.NODE_ENV !== "production") {
		console.warn(
			"[styled] `selectors` found in config. Use `within` for scoped descendant styles.",
		)
	}

	function normalizeWithinSelector(rootSelector: string, key: string) {
		const trimmed = String(key ?? "").trim()
		if (!trimmed) return rootSelector
		if (trimmed.startsWith("&")) return trimmed.replace(/&/g, rootSelector)
		if (trimmed.startsWith(":") || trimmed.startsWith("::")) {
			if (process.env.NODE_ENV !== "production") {
				throw new Error(
					`[styled.within] pseudo selector "${trimmed}" must start with '&'. use "&${trimmed}"`,
				)
			}
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

	const variantDefs: Array<{
		name: string
		options: Record<string, string>
		defaultValue?: string | boolean
	}> = []
	for (const [variantName, options] of Object.entries(
		(cfg as any).variants ?? {},
	)) {
		const optionClassMap: Record<string, string> = {}
		for (const [option, blocks] of Object.entries(options as any)) {
			const baseBlocks = Array.isArray(blocks)
				? (blocks as any)
				: (blocks as any)?.base
			let cls = flatten(baseBlocks as any)
				.map((b) => style(b))
				.join(" ")

			const withinEntries = (
				Array.isArray(blocks) ? undefined : (blocks as any)?.within
			) as Record<string, any> | undefined
			if (withinEntries && !cls) {
				cls = style({}, `styled_variant_marker_${variantName}_${option}`)
			}

			optionClassMap[option] = cls
			if (withinEntries) {
				const variantParts = splitClasses(cls)
				emitWithinStyles([...baseClassParts, ...variantParts], withinEntries)
			}
		}
		variantDefs.push({
			name: variantName,
			options: optionClassMap,
			defaultValue: ((cfg as any).defaults ?? ({} as any))[variantName],
		})
	}

	if ((cfg as any)?.within) {
		emitWithinStyles(baseClassParts, (cfg as any).within as Record<string, any>)
	}

	const compiledCompounds: Array<{
		className: string
		conditions: Record<string, string | boolean>
	}> = []
	const compoundList: any[] = (
		Array.isArray((cfg as any)?.compoundVariants)
			? (cfg as any).compoundVariants
			: Array.isArray((cfg as any)?.compounds)
				? (cfg as any).compounds
				: []
	) as any[]
	for (const raw of compoundList) {
		if (!raw || typeof raw !== "object") continue
		const { base: compoundBase, within: compoundWithin, ...conditions } = raw as any
		let compoundClass = flatten(compoundBase as any)
			.map((b) => style(b))
			.join(" ")
		if (!compoundClass) compoundClass = style({}, "styled_compound_marker")
		compiledCompounds.push({ className: compoundClass, conditions })
		if (compoundWithin) {
			const compParts = splitClasses(compoundClass)
			emitWithinStyles([...baseClassParts, ...compParts], compoundWithin as any)
		}
	}

	const rawVarTokens = ((cfg as any).vars ?? {}) as Record<
		string,
		string | { token: string; unit?: string }
	>
	const varDefs: Array<{ propName: string; cssVarName: string; unit?: string }> = []
	for (const [propName, tokenSpec] of Object.entries(rawVarTokens)) {
		const { token: rawName, unit } =
			typeof tokenSpec === "string" ? { token: tokenSpec, unit: undefined } : tokenSpec
		const trimmed = (rawName ?? "").trim()
		const cssVarName = trimmed.startsWith("var(")
			? trimmed.slice(4, -1).trim()
			: trimmed.startsWith("--")
				? trimmed
				: `--${trimmed}`
		varDefs.push({ propName, cssVarName, unit })
	}

	const blockedKeys = [
		...variantDefs.map((d) => d.name),
		...Object.keys(rawVarTokens),
	]

	const args: RuntimeArgs = {
		tag,
		baseClass,
		...(variantDefs.length ? { variantDefs } : {}),
		...(compiledCompounds.length
			? {
				compoundChecks: compiledCompounds.map(({ className, conditions }) => ({
					className,
					checks: Object.entries(conditions ?? {}) as Array<[
						string,
						string | boolean,
					]>,
				})),
			}
			: {}),
		...(varDefs.length ? { varDefs } : {}),
		...(blockedKeys.length ? { blockedKeys } : {}),
	}

	const Component = runtimeStyled(args)
	addFunctionSerializer(Component, {
		importPath: "library/styled/runtime",
		importName: "runtimeStyled",
		args: [args],
	})
	return Component
}





