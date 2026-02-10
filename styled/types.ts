import type {
	createVar,
	GlobalStyleRule,
	StyleRule as PlainRule,
} from "@vanilla-extract/css"
import type { JSX, ReactNode } from "react"

type GlobalStyleRules = GlobalStyleRule | GlobalStyleRules[]
export type WithinBlock = Record<string, GlobalStyleRules>
export type WithinRule = PlainRule & { within?: WithinBlock }

export type StyleRules = WithinRule | string | StyleRules[]
type CompoundVariant<Props> = Props & {
	base: StyleRules
}
type TokenOptions =
	| {
			token: ReturnType<typeof createVar>
			unit?: string
			optional?: boolean
	  }
	| ReturnType<typeof createVar>
type StringToBoolean<T> = T extends "true" | "false" ? boolean : T

// schemas to extend for type safety
export type VariantsSchema = Record<string, Record<string, StyleRules>>
export type TokensSchema = Record<string, TokenOptions>
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

type TokenProps<Tokens extends TokensSchema> = {
	[Key in keyof Tokens as Tokens[Key] extends string
		? never
		: Tokens[Key] extends { optional: true }
			? never
			: Tokens[Key] extends { optional: false }
				? Key
				: never]: string | number
} & {
	[Key in keyof Tokens]?: string | number
}

/**
 * The main type for styled configs
 */
export type GenericConfig<
	Variants extends VariantsSchema,
	Tokens extends TokensSchema,
	DefaultVariants extends DefaultVariantsSchema<Variants>,
> = {
	/** The base style rule applied to the component. */
	base?: StyleRules
	/** Component-specific selectors, e.g., { '&:hover': { ... } } */
	within?: WithinBlock
	/** Variant definitions. */
	variants?: Variants
	/** Default values for variants. */
	defaultVariants?: DefaultVariants

	/** CSS variable definitions. */
	tokens?: Tokens
	/** Rules for applying styles when multiple variants are active. */
	compoundVariants?: NoInfer<
		Array<CompoundVariant<VariantProps<Variants, DefaultVariants>>>
	>
}

// helpers
// biome-ignore lint/suspicious/noExplicitAny: necessary for distributive omit
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
	Tokens extends TokensSchema,
	DefaultVariants extends DefaultVariantsSchema<Variants>,
> = DistributiveOmit<
	Props,
	SafeKeyOf<VariantProps<Variants, never>> | SafeKeyOf<TokenProps<Tokens>>
> &
	([Variants] extends [never]
		? unknown
		: VariantProps<Variants, DefaultVariants>) &
	([Tokens] extends [never] ? unknown : TokenProps<Tokens>)

/** className from Props is preserved so Base UI-style function className works */
export type StyledComponent<Props> = (
	props: Props extends { className?: infer C }
		? Omit<Props, "className"> & { className?: C }
		: never,
) => JSX.Element

export type FunctionComponent<Props> = (
	props: Props,
) => ReactNode | Promise<ReactNode>

/**
 * Internal type for styled options object.
 * Used internally by core.ts to distinguish styled config objects from plain style rules.
 */
export type StyledOptions = GenericConfig<
	VariantsSchema,
	TokensSchema,
	DefaultVariantsSchema<VariantsSchema>
>

/**
 * Internal type for styled config input.
 * Can be a plain style rule, array of style rules, or a styled options object.
 */
export type StyledInput = StyledOptions | StyleRules
