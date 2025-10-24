import { type ComponentType, createElement } from "react"

export function withComponent<BaseProps extends Record<string, unknown>>(
	Target: ComponentType<any>,
	Base: ComponentType<BaseProps>,
) {
	return (props: BaseProps) =>
		createElement(Base as any, { ...props, as: Target })
}





