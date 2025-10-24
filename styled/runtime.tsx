type ClassName = string | undefined | null

function cx(...classes: ClassName[]) {
	return classes.filter(Boolean).join(" ")
}

export type RuntimeArgs = {
	tag: string
	baseClass: string
	variantDefs?: Array<{
		name: string
		options: Record<string, string>
		defaultValue?: string | boolean
	}>
	compoundChecks?: Array<{
		className: string
		checks: Array<[string, string | boolean]>
	}>
	varDefs?: Array<{
		propName: string
		cssVarName: string
		unit?: string
	}>
	blockedKeys?: string[]
}

export function runtimeStyled({
	tag,
	baseClass,
	variantDefs,
	compoundChecks,
	varDefs,
	blockedKeys,
}: RuntimeArgs) {
	const blockedSet = new Set<string>([...(blockedKeys ?? []), "as"])
	const Component = function StyledRuntime(
		props: Record<string, unknown> = {},
	) {
		const { className, style, children, ...rest } = props

		// compute variant classes from props, falling back to defaults
		const variantClasses: string[] = []
		const variantValues: Record<string, string | boolean | undefined> = {}
		for (const def of variantDefs ?? []) {
			const value = (props as any)[def.name]
			const effective = value === undefined ? def.defaultValue : value
			variantValues[def.name] = effective as any
			if (effective !== undefined) {
				const key = String(effective)
				const cls = def.options[key]
				if (cls) variantClasses.push(cls)
			}
		}

		// compute compound variant classes when all conditions match active variant values
		const compoundClasses: string[] = []
		for (const entry of compoundChecks ?? []) {
			let matches = true
			for (const [name, expected] of entry.checks ?? []) {
				if (variantValues[name] !== expected) {
					matches = false
					break
				}
			}
			if (matches && entry.className) compoundClasses.push(entry.className)
		}

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
		return (
			<Render
				className={cx(
					baseClass,
					...variantClasses,
					...compoundClasses,
					className as any,
				)}
				style={{ ...(style as any), ...varStyle }}
				{...domProps}
			>
				{children}
			</Render>
		)
	}

	return Component
}





