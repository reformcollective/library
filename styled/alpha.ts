import type { ComponentClass, ComponentProps, JSX } from "react"
import { styledCore } from "./core"
import type {
	DefaultVariantsSchema,
	FunctionComponent,
	GenericConfig,
	StyledComponent,
	StyledInput,
	StyledOutProps,
	StyleRules,
	TokensSchema,
	VariantsSchema,
} from "./types"

export * from "./vanilla"

export function compileTime<T>(getValue: () => T): T {
	return getValue()
}

// using a union for the type of Component will cause
// generic forwarding to fail, so we have overloads for each type

// Overload: intrinsic tag (e.g., 'div')
export function styled<
	Tag extends keyof JSX.IntrinsicElements,
	_Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Tokens extends TokensSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	Component: Tag,
	config: GenericConfig<Variants, Tokens, DefaultVariants> | StyleRules,
	debugId?: string,
): StyledComponent<
	StyledOutProps<ComponentProps<Tag>, Variants, Tokens, DefaultVariants>
>

// Overload: component target (function)
export function styled<
	_Tag extends keyof JSX.IntrinsicElements,
	Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Tokens extends TokensSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	Component: FunctionComponent<Props>,
	config: GenericConfig<Variants, Tokens, DefaultVariants> | StyleRules,
	debugId?: string,
): StyledComponent<StyledOutProps<Props, Variants, Tokens, DefaultVariants>>

// Overload: component target (class)
export function styled<
	_Tag extends keyof JSX.IntrinsicElements,
	Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Tokens extends TokensSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	Component: ComponentClass<Props>,
	config: GenericConfig<Variants, Tokens, DefaultVariants> | StyleRules,
	debugId?: string,
): StyledComponent<StyledOutProps<Props, Variants, Tokens, DefaultVariants>>

// most generic, only exists to catch config errors
// since if the config is invalid typescript will check against
// the last overload
export function styled<
	Tag extends keyof JSX.IntrinsicElements,
	Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Tokens extends TokensSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	target: FunctionComponent<Props> | ComponentClass<Props> | Tag,
	config: GenericConfig<Variants, Tokens, DefaultVariants> | StyleRules,
	debugId?: string,
): "Your styled configuration has errors"

// Implementation
export function styled<
	Tag extends keyof JSX.IntrinsicElements,
	Props extends { className?: string },
	const Variants extends VariantsSchema = never,
	const Tokens extends TokensSchema = never,
	const DefaultVariants extends DefaultVariantsSchema<Variants> = never,
>(
	target: FunctionComponent<Props> | ComponentClass<Props> | Tag,
	config: GenericConfig<Variants, Tokens, DefaultVariants> | StyleRules,
	debugId?: string,
): unknown {
	try {
		if (typeof target === "string")
			return styledCore(target, config as StyledInput, debugId)

		// this will be intercepted by the vanilla split loader
		return styledCore("div", config as StyledInput, debugId)
	} catch (e) {
		console.log(
			"Encountered an error while generating styles for",
			debugId || "component with no debug id",
		)
		throw e
	}
}
