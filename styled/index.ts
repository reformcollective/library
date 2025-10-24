import type { JSX } from "react"
import {
	type ComponentClass,
	type ComponentType,
	createElement,
	type FunctionComponent,
} from "react"
import { styledCore } from "./core"
import type { StyledComponent, StyledConfig, StyledOutProps } from "./types"

// Overload: component target (function)
export function styled<
	Props extends { className?: string },
	const TConfig extends StyledConfig,
>(
	Component: FunctionComponent<Props>,
	config: TConfig,
): StyledComponent<StyledOutProps<Props, TConfig>>

// Overload: component target (class)
export function styled<
	Props extends { className?: string },
	const TConfig extends StyledConfig,
>(
	Component: ComponentClass<Props>,
	config: TConfig,
): StyledComponent<StyledOutProps<Props, TConfig>>

// Overload: intrinsic tag (e.g., 'div')
export function styled<
	Tag extends keyof JSX.IntrinsicElements,
	const TConfig extends StyledConfig,
>(
	Component: Tag,
	config: TConfig,
): StyledComponent<StyledOutProps<JSX.IntrinsicElements[Tag], TConfig>>

// Implementation
export function styled(
	target: string | ComponentType<any>,
	config: StyledConfig,
) {
	if (typeof target === "string") return styledCore(target, config)
	// component target: build a base with a default tag and wrap with runtime `as`
	const Base = styledCore("div", config)
	const Wrapper = (props: Record<string, unknown> = {}) =>
		createElement(Base as any, { ...props, as: target })
	return Wrapper
}
