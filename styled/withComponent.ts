import { type ComponentType, createElement } from "react"

export function withComponent<BaseProps extends Record<string, unknown>>(
	Target: ComponentType<unknown>,
	Base: ComponentType<BaseProps>,
) {
	const Component = (props: BaseProps) => createElement(Base, { ...props, as: Target })

	Component.toString = () => Base.toString()

	return Component
}
