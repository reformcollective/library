import type { ComponentProps, JSX } from "react"
import { type ComponentClass, createElement } from "react"
import { styledCore } from "./core"
import type {
	DefaultVariantsSchema,
	FunctionComponent,
	GenericConfig,
	StyledComponent,
	StyledInput,
	StyledOutProps,
	StyleRules,
	VariablesSchema,
	VariantsSchema,
} from "./types"

// using a union for the type of Component will cause
// generic forwarding to fail, so we have overloads for each type

// Overload: intrinsic tag (e.g., 'div')
export function styled<
	Tag extends keyof JSX.IntrinsicElements,
	_Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Variables extends VariablesSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	Component: Tag,
	config: GenericConfig<Variants, Variables, DefaultVariants> | StyleRules,
): StyledComponent<
	StyledOutProps<ComponentProps<Tag>, Variants, Variables, DefaultVariants>
>

// Overload: component target (function)
export function styled<
	_Tag extends keyof JSX.IntrinsicElements,
	Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Variables extends VariablesSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	Component: FunctionComponent<Props>,
	config: GenericConfig<Variants, Variables, DefaultVariants> | StyleRules,
): StyledComponent<StyledOutProps<Props, Variants, Variables, DefaultVariants>>

// Overload: component target (class)
export function styled<
	_Tag extends keyof JSX.IntrinsicElements,
	Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Variables extends VariablesSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	Component: ComponentClass<Props>,
	config: GenericConfig<Variants, Variables, DefaultVariants> | StyleRules,
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
	config: GenericConfig<Variants, Variables, DefaultVariants> | StyleRules,
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
	config: GenericConfig<Variants, Variables, DefaultVariants> | StyleRules,
): unknown {
	if (typeof target === "string")
		return styledCore(target, config as StyledInput)
	// component target: build a base with a default tag and wrap with runtime `as`
	const Base = styledCore("div", config as StyledInput)
	const Wrapper = (props: Record<string, unknown> = {}) =>
		createElement(Base, {
			...props,
			// @ts-expect-error technically invalid but will be intercepted during bundling
			as: target,
		})
	return Wrapper
}
