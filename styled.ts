import { style } from "@vanilla-extract/css"
import { addFunctionSerializer } from "@vanilla-extract/css/functionSerializer"
import { runtimeStyled } from "./styled.runtime"

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
			slots?: Record<string, (SerializableStyle | SerializableStyle[])[]>
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

export function styled(tag: string, config: StyledConfig) {
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
			slotClasses: {},
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

	const variantClassMap: Record<string, Record<string, string>> = {}
	for (const [variantName, options] of Object.entries(config.variants ?? {})) {
		variantClassMap[variantName] = {}
		for (const [option, blocks] of Object.entries(options as any)) {
			const cls = flatten(blocks as any)
				.map((b) => style(b))
				.join(" ")
			variantClassMap[variantName][option] = cls
		}
	}

	const slotClasses: Record<string, string> = {}
	for (const [slotName, blocks] of Object.entries(
		(config as any).slots ?? {},
	)) {
		slotClasses[slotName] = flatten(blocks as any)
			.map((b) => style(b))
			.join(" ")
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
		slotClasses,
	}

	const Component = runtimeStyled(args)
	addFunctionSerializer(Component, {
		importPath: "library/styled.runtime",
		importName: "runtimeStyled",
		args: [args],
	})
	return Component
}
