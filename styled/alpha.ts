import type { ComponentProps, JSX } from "react"
import { type ComponentClass, createElement } from "react"
import { styledCore } from "./core"
import type {
	GenericConfig,
	DefaultVariantsSchema,
	FunctionComponent,
	StyledComponent,
	StyledOutProps,
	VariablesSchema,
	VariantsSchema,
} from "./types"

// using a union for the type of Component will cause
// generic forwarding to fail, so we have overloads for each type

// Overload: intrinsic tag (e.g., 'div')
export function styled<
	Tag extends keyof JSX.IntrinsicElements,
	Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Variables extends VariablesSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	Component: Tag,
	config: GenericConfig<Variants, Variables, DefaultVariants>,
): StyledComponent<
	StyledOutProps<ComponentProps<Tag>, Variants, Variables, DefaultVariants>
>

// Overload: component target (function)
export function styled<
	Tag extends keyof JSX.IntrinsicElements,
	Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Variables extends VariablesSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	Component: FunctionComponent<Props>,
	config: GenericConfig<Variants, Variables, DefaultVariants>,
): StyledComponent<StyledOutProps<Props, Variants, Variables, DefaultVariants>>

// Overload: component target (class)
export function styled<
	Tag extends keyof JSX.IntrinsicElements,
	Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Variables extends VariablesSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	Component: ComponentClass<Props>,
	config: GenericConfig<Variants, Variables, DefaultVariants>,
): StyledComponent<StyledOutProps<Props, Variants, Variables, DefaultVariants>>

// most generic, only exists to catch config errors
// since if the config is invalid typescript will check against
// the last overload
export function styled<
	Tag extends keyof JSX.IntrinsicElements,
	Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Variables extends VariablesSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	target: FunctionComponent<Props> | ComponentClass<Props> | Tag,
	config: GenericConfig<Variants, Variables, DefaultVariants>,
): "Your styled configuration has errors"

// Implementation
export function styled<
	Tag extends keyof JSX.IntrinsicElements,
	Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Variables extends VariablesSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	target: FunctionComponent<Props> | ComponentClass<Props> | Tag,
	config: GenericConfig<Variants, Variables, DefaultVariants>,
): any {
	if (typeof target === "string") return styledCore(target, config)
	// component target: build a base with a default tag and wrap with runtime `as`
	const Base = styledCore("div", config)
	const Wrapper = (props: Record<string, unknown> = {}) =>
		createElement(Base as any, { ...props, as: target })
	return Wrapper
}
