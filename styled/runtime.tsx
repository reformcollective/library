import { cva, cx } from "class-variance-authority"

// These types are imported from your "./types"
export type ClassValue =
	| ClassArray
	| ClassDictionary
	| string
	| number
	| bigint
	| null
	| boolean
	| undefined
export type ClassDictionary = Record<string, unknown>
export type ClassArray = ClassValue[]

type ConfigSchema = Record<string, Record<string, ClassValue>>
type AnyConfigVariants = Record<string, string | boolean | null | undefined>

/**
 * The final non-generic Config type.
 */
export type CvaConfig = {
	variants?: ConfigSchema
	defaultVariants?: AnyConfigVariants
	compoundVariants?: Record<string, unknown>[]
}

export type RuntimeArgs = {
	tag: string
	cvaBase: string
	cvaOptions?: CvaConfig
	varDefs?: Array<{
		propName: string
		cssVarName: string
		unit?: string
	}>
}

export function runtimeStyled({
	tag,
	cvaBase,
	cvaOptions,
	varDefs,
}: RuntimeArgs) {
	// @ts-expect-error generated value won't match for cva
	const resolve = cva(cvaBase, cvaOptions)

	// compute blocked keys set once
	const variantKeys = Object.keys(
		(cvaOptions?.variants ?? {}) as Record<string, unknown>,
	)
	const varKeys = (varDefs ?? []).map((d) => d.propName)
	const blockedSet = new Set<string>([...variantKeys, ...varKeys, "as"])

	const Component = function StyledRuntime(
		props: Record<string, unknown> = {},
	) {
		const { className, style, children, ...rest } = props

		// compute css variable inline styles from props using pre-normalized var defs
		const varStyle: Record<string, string> = {}
		for (const def of varDefs ?? []) {
			const raw = props[def.propName]
			if (raw === undefined || raw === null) continue
			varStyle[def.cssVarName] =
				typeof raw === "number" && def.unit ? `${raw}${def.unit}` : String(raw)
		}

		// filter dynamic props so they don't leak to the DOM
		const domProps: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(rest)) {
			if (!blockedSet.has(key)) domProps[key] = value
		}

		const Render = props.as ?? tag
		// @ts-expect-error
		const resolved = resolve(props)
		return (
			// @ts-expect-error
			<Render
				// @ts-expect-error
				className={cx(resolved, className)}
				// @ts-expect-error
				style={{ ...style, ...varStyle }}
				{...domProps}
			>
				{children}
			</Render>
		)
	}

	Component.toString = () => {
		return cvaBase
	}

	return Component
}
