import { style, globalStyle } from "@vanilla-extract/css"
import { addFunctionSerializer } from "@vanilla-extract/css/functionSerializer"
import { runtimeStyled } from "./styled.runtime"
import { createElement, type ComponentType } from "react"

type SerializableStyle = Record<string, unknown>

type StyledConfig =
	| (SerializableStyle | SerializableStyle[]) // simple form: array of compiled style objects
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

function styledCore(tag: string, config: StyledConfig) {
	if (!config || Array.isArray(config)) {
		const baseBlocks = Array.isArray(config) ? config : [config]
		const baseClasses = baseBlocks.map((b) => style(b as SerializableStyle))
		const baseClass = baseClasses.join(" ")
		const args = {
			tag,
			baseClass,
			variantClassMap: {},
			defaultVariants: {} as Record<string, string | boolean>,
			varTokens: {} as Record<
				string,
				string | { token: string; unit?: string }
			>,
		}
		const Component = runtimeStyled(args)
		addFunctionSerializer(Component, {
			importPath: "library/styled.runtime",
			importName: "runtimeStyled",
			args: [args],
		})
		return Component
	}

	// object form
	const base = flatten((config as any).base as any)
	const baseClass = base.map((b) => style(b)).join(" ")

	// helper: split classes for anchoring selectors
	const splitClasses = (cls: string) => cls.split(" ").filter(Boolean)
	const baseClassParts = splitClasses(baseClass)

	// dev guard: avoid confusion with VE selectors API
	if ((config as any)?.selectors && process.env.NODE_ENV !== "production") {
		console.warn(
			"[styled] `selectors` found in config. Use `within` for scoped descendant styles.",
		)
	}

	// normalize selector relative to root
	function normalizeWithinSelector(rootSelector: string, key: string) {
		const trimmed = String(key ?? "").trim()
		if (!trimmed) return rootSelector
		if (trimmed.startsWith("&")) return trimmed.replace(/&/g, rootSelector)
		// warn on pseudo without '&' as it's likely unintended
		if (
			process.env.NODE_ENV !== "production" &&
			(trimmed.startsWith(":") || trimmed.startsWith("::"))
		) {
			console.warn(
				`[styled.within] Pseudo selector "${trimmed}" should be prefixed with '&'.`,
			)
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

	function emitWithinStyles(anchorClasses: string[], entries?: Record<string, any>) {
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

	const variantClassMap: Record<string, Record<string, string>> = {}
	for (const [variantName, options] of Object.entries((config as any).variants ?? {})) {
		variantClassMap[variantName] = {}
		for (const [option, blocks] of Object.entries(options as any)) {
			// support object form: { base, within }
			const baseBlocks = Array.isArray(blocks) ? (blocks as any) : (blocks as any)?.base
			const cls = flatten(baseBlocks as any)
				.map((b) => style(b))
				.join(" ")
			variantClassMap[variantName][option] = cls

			// variant-level within
			const withinEntries = (Array.isArray(blocks) ? undefined : (blocks as any)?.within) as
				| Record<string, any>
				| undefined
			if (withinEntries) {
				const variantParts = splitClasses(cls)
				emitWithinStyles([...baseClassParts, ...variantParts], withinEntries)
			}
		}
	}

	// slots API removed in favor of `within`

	// base-level within
	if ((config as any)?.within) {
		emitWithinStyles(baseClassParts, (config as any).within as Record<string, any>)
	}

	// compound variants
	const compiledCompounds: Array<{
		className: string
		conditions: Record<string, string | boolean>
	}> = []
	const compoundList: any[] =
		(Array.isArray((config as any)?.compoundVariants)
			? (config as any).compoundVariants
			: Array.isArray((config as any)?.compounds)
				? (config as any).compounds
				: []) as any[]
	for (const raw of compoundList) {
		if (!raw || typeof raw !== "object") continue
		const { base: compoundBase, within: compoundWithin, ...conditions } = raw as any
		let compoundClass = flatten(compoundBase as any)
			.map((b) => style(b))
			.join(" ")
		// ensure we have a marker class to anchor selectors and attach at runtime
		if (!compoundClass) compoundClass = style({})
		compiledCompounds.push({ className: compoundClass, conditions })
		if (compoundWithin) {
			const compParts = splitClasses(compoundClass)
			emitWithinStyles([...baseClassParts, ...compParts], compoundWithin as any)
		}
	}

	// direct pass-through of var tokens
	const varTokens = (config.vars ?? {}) as Record<
		string,
		string | { token: string; unit?: string }
	>

	const args = {
		tag,
		baseClass,
		variantClassMap,
		defaultVariants: (config.defaults ?? {}) as Record<
			string,
			string | boolean
		>,
		varTokens,
		compoundVariants: compiledCompounds,
	}

	const Component = runtimeStyled(args)
	addFunctionSerializer(Component, {
		importPath: "library/styled.runtime",
		importName: "runtimeStyled",
		args: [args],
	})
	return Component
}

export function styled(
	target: string | ComponentType<any>,
	config: StyledConfig,
) {
	if (typeof target === "string") return styledCore(target, config)
	// component target: build a base with a default tag and wrap with `as`
	const Base = styledCore("div", config)
	const Wrapper = (props: Record<string, unknown> = {}) =>
		createElement(Base as any, { ...props, as: target })
	return Wrapper
}
