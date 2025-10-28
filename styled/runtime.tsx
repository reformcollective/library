import { cva } from "class-variance-authority"

type ClassName = string | undefined | null

function cx(...classes: ClassName[]) {
	return classes.filter(Boolean).join(" ")
}

export type RuntimeArgs = {
	tag: string
	cvaBase: string | string[]
	cvaOptions?: Record<string, unknown>
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
	const resolve = cva(cvaBase as any, cvaOptions as any)

	// compute blocked keys set once
	const variantKeys = Object.keys(
		((cvaOptions as any)?.variants ?? {}) as Record<string, unknown>,
	)
	const varKeys = (varDefs ?? []).map((d) => d.propName)
	const blockedSet = new Set<string>([...variantKeys, ...varKeys, "as"])

	const Component = function StyledRuntime(
		props: Record<string, unknown> = {},
	) {
		const { className, style, children, ...rest } = props as any

		// compute css variable inline styles from props using pre-normalized var defs
		const varStyle: Record<string, string> = {}
		for (const def of varDefs ?? []) {
			const raw = (props as any)[def.propName]
			if (raw === undefined || raw === null) continue
			varStyle[def.cssVarName] =
				typeof raw === "number" && def.unit ? `${raw}${def.unit}` : String(raw)
		}

		// filter dynamic props so they don't leak to the DOM
		const domProps: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(rest)) {
			if (!blockedSet.has(key)) domProps[key] = value
		}

		const Render: any = (props as any).as ?? tag
		const resolved = resolve(props as any)
		return (
			<Render
				className={cx(resolved, className as any)}
				style={{ ...(style as any), ...varStyle }}
				{...domProps}
			>
				{children}
			</Render>
		)
	}

	return Component
}
