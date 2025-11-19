import { type ComponentType, createElement } from "react"

export function withComponent<BaseProps extends Record<string, unknown>>(
	Target: ComponentType<unknown>,
	Base: ComponentType<BaseProps>,
) {
	return (props: BaseProps) => createElement(Base, { ...props, as: Target })
}
