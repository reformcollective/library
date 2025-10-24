import { createElement, type ComponentType } from "react"
import { styledCore, type StyledConfig } from "./core"

export { styledCore }

export function styled(
	target: string | ComponentType<any>,
	config: StyledConfig,
) {
	if (typeof target === "string") return styledCore(target, config)
	const Base = styledCore("div", config)
	const Wrapper = (props: Record<string, unknown> = {}) =>
		createElement(Base as any, { ...props, as: target })
	return Wrapper
}





