import type { createVar, StyleRule as PlainRule } from "@vanilla-extract/css"
import type { JSX, ReactNode } from "react"

type PlainStyleRules = PlainRule | string | PlainStyleRules[]
type WithinBlock = Record<string, PlainStyleRules>
type WithinRule = PlainRule & { within?: WithinBlock }

export type StyleRules = WithinRule | string | StyleRules[]
type CompoundVariant<Props> = Props & {
	base: StyleRules
}
type VariableOptions =
	| {
			token: ReturnType<typeof createVar>
			unit?: string
			optional?: boolean
	  }
	| ReturnType<typeof createVar>
type StringToBoolean<T> = T extends "true" | "false" ? boolean : T
type BooleanToString<T> = T extends boolean ? "true" | "false" : T

// schemas to extend for type safety
export type VariantsSchema = Record<string, Record<string, StyleRules>>
export type VariablesSchema = Record<string, VariableOptions>
export type DefaultVariantsSchema<Variants> = {
	[Key in keyof Variants]?: StringToBoolean<keyof Variants[Key]>
}

type VariantProps<
	Variants extends VariantsSchema,
	DefaultVariants extends DefaultVariantsSchema<Variants>,
> = {
	[Key in keyof Variants as [DefaultVariants] extends [never]
		? Key
		: Key extends keyof DefaultVariants
			? never
			: Key]: StringToBoolean<keyof Variants[Key]>
} & {
	[Key in keyof Variants]?: StringToBoolean<keyof Variants[Key]>
}

type VariableProps<Variables extends VariablesSchema> = {
	[Key in keyof Variables as Variables[Key] extends string
		? never
		: Variables[Key] extends { optional: true }
			? never
			: Variables[Key] extends { optional: false }
				? Key
				: never]: string | number
} & {
	[Key in keyof Variables]?: string | number
}

/**
 * The main type for styled configs
 */
export type GenericConfig<
	Variants extends VariantsSchema,
	Variables extends VariablesSchema,
	DefaultVariants extends DefaultVariantsSchema<Variants>,
> =
	| {
			/** The base style rule applied to the component. */
			base?: StyleRules
			/** Component-specific selectors, e.g., { '&:hover': { ... } } */
			within?: WithinBlock
			/** Variant definitions. */
			variants?: Variants
			/** Default values for variants. */
			defaultVariants?: DefaultVariants

			/** CSS variable definitions. */
			variables?: Variables
			/** Rules for applying styles when multiple variants are active. */
			compoundVariants?: NoInfer<
				Array<CompoundVariant<VariantProps<Variants, DefaultVariants>>>
			>
	  }
	| StyleRules

// helpers
type DistributiveOmit<Type, Keys extends keyof any> = Type extends any
	? Omit<Type, Keys>
	: never

type SafeKeyOf<T> = T extends never ? never : keyof T

/**
 * The final props for the component, merging base props with inferred variant/var props.
 */
export type StyledOutProps<
	Props,
	Variants extends VariantsSchema,
	Variables extends VariablesSchema,
	DefaultVariants extends DefaultVariantsSchema<Variants>,
> = DistributiveOmit<
	Props,
	SafeKeyOf<VariantProps<Variants, never>> | SafeKeyOf<VariableProps<Variables>>
> &
	([Variants] extends [never]
		? unknown
		: VariantProps<Variants, DefaultVariants>) &
	([Variables] extends [never] ? unknown : VariableProps<Variables>)

export type StyledComponent<Props> = (
	props: Props & { className?: string },
) => JSX.Element

export type FunctionComponent<Props> = (
	props: Props,
) => ReactNode | Promise<ReactNode>
