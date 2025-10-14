type ClassName = string | undefined | null

function cx(...classes: ClassName[]) {
	return classes.filter(Boolean).join(" ")
}

export type RuntimeArgs = {
	tag: string
	baseClass: string
	variantClassMap: Record<string, Record<string, string>>
	defaultVariants?: Record<string, string | boolean>
	varTokens?: Record<string, string | { token: string; unit?: string }>
	compoundVariants?: Array<{
		className: string
		conditions: Record<string, string | boolean>
	}>
}

export function runtimeStyled({
	tag,
	baseClass,
	variantClassMap,
	defaultVariants,
	varTokens,
	compoundVariants,
}: RuntimeArgs) {
	const Component = function StyledRuntime(
		props: Record<string, unknown> = {},
	) {
		const { ref, className, style, children, ...rest } = props

		// compute variant classes from props, falling back to defaults
		const variantClasses: string[] = []
		const variantValues: Record<string, string | boolean | undefined> = {}
		for (const [variantName, options] of Object.entries(variantClassMap)) {
			const value = (props as any)[variantName]
			const effective =
				value === undefined ? (defaultVariants as any)?.[variantName] : value
			variantValues[variantName] = effective as any
			if (effective !== undefined) {
				const key = String(effective)
				const cls = options[key]
				if (cls) variantClasses.push(cls)
			}
		}

		// compute compound variant classes when all conditions match active variant values
		const compoundClasses: string[] = []
		for (const entry of compoundVariants ?? []) {
			let matches = true
			for (const [name, expected] of Object.entries(entry.conditions ?? {})) {
				if (variantValues[name] !== expected) {
					matches = false
					break
				}
			}
			if (matches && entry.className) compoundClasses.push(entry.className)
		}

		// compute css variable inline styles from props
		const varStyle: Record<string, string> = {}
		for (const [propName, token] of Object.entries(varTokens ?? {})) {
			const raw = (props as any)[propName]
			if (raw === undefined || raw === null) continue
			const { token: rawName, unit } =
				typeof token === "string" ? { token, unit: undefined } : token
			// normalize to a custom property key like "--heightVar..." for inline styles
			const trimmed = (rawName ?? "").trim()
			const cssVarName = trimmed.startsWith("var(")
				? trimmed.slice(4, -1).trim()
				: trimmed.startsWith("--")
					? trimmed
					: `--${trimmed}`
			varStyle[cssVarName] =
				typeof raw === "number" && unit ? `${raw}${unit}` : String(raw)
		}

		// filter dynamic props so they don't leak to the DOM
		const blocked = new Set<string>([
			...Object.keys(variantClassMap),
			...Object.keys(varTokens ?? {}),
			"as",
		])
		const domProps: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(rest)) {
			if (!blocked.has(key)) domProps[key] = value
		}

		const Render: any = (props as any).as ?? tag
		return (
			<Render
				ref={ref as any}
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
