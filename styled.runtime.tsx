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
	slotClasses?: Record<string, string>
}

export function runtimeStyled({
	tag,
	baseClass,
	variantClassMap,
	defaultVariants,
	varTokens,
	slotClasses,
}: RuntimeArgs) {
	const Component = function StyledRuntime(
		props: Record<string, unknown> = {},
	) {
		const { ref, className, style, children, ...rest } = props

		// compute variant classes from props, falling back to defaults
		const variantClasses: string[] = []
		for (const [variantName, options] of Object.entries(variantClassMap)) {
			const value = (props as any)[variantName]
			const effective =
				value === undefined ? (defaultVariants as any)?.[variantName] : value
			if (effective !== undefined) {
				const key = String(effective)
				const cls = options[key]
				if (cls) variantClasses.push(cls)
			}
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
		])
		const domProps: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(rest)) {
			if (!blocked.has(key)) domProps[key] = value
		}

		const Tag: any = tag
		return (
			<Tag
				ref={ref as any}
				className={cx(baseClass, ...variantClasses, className as any)}
				style={{ ...(style as any), ...varStyle }}
				{...domProps}
			>
				{children}
			</Tag>
		)
	}

	// expose slots as static property so users can attach classes to children
	;(Component as any).slots = slotClasses ?? {}

	return Component
}
