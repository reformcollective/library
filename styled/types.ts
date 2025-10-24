import type { JSX, ReactNode } from "react"

// --- Config Types (as provided) ---

export type SerializableStyle = Record<string, unknown>

export type StyledConfig =
	| (SerializableStyle | SerializableStyle[]) // simple form: array of compiled style objects
	| {
			base?: (SerializableStyle | SerializableStyle[])[]
			variants?: Record<
				string,
				Record<string, (SerializableStyle | SerializableStyle[])[]>
			>
			defaults?: Record<string, string | boolean>
			vars?: Record<string, string | { token: string; unit?: string }>
	  }

// --- Helper Types (as provided, mostly) ---

type VariantsOf<TConfig> = TConfig extends { variants: infer V } ? V : {}
type DefaultsOf<TConfig> = TConfig extends { defaults: infer D } ? D : {}
type VarsOf<TConfig> = TConfig extends { vars: infer TVars } ? TVars : {}

type OptionalVariantKeys<TConfig> = Extract<
	keyof VariantsOf<TConfig>,
	keyof DefaultsOf<TConfig>
>
type RequiredVariantKeys<TConfig> = Exclude<
	keyof VariantsOf<TConfig>,
	OptionalVariantKeys<TConfig>
>

// Correctly handles boolean variants (where keys are "true" or "false")
type VariantOptionValue<V, K extends keyof V> = keyof V[K] extends
	| "true"
	| "false"
	? boolean
	: keyof V[K]

type GetVariantProps<TConfig> = [keyof VariantsOf<TConfig>] extends [never]
	? {}
	: {
			// required variants (no default)
			[K in RequiredVariantKeys<TConfig>]: VariantOptionValue<
				VariantsOf<TConfig>,
				K
			>
		} & {
			// optional variants (have default)
			[K in OptionalVariantKeys<TConfig>]?:
				| VariantOptionValue<VariantsOf<TConfig>, K>
				| undefined
		}

type GetVarProps<TConfig> = [keyof VarsOf<TConfig>] extends [never]
	? {}
	: { [K in keyof VarsOf<TConfig>]?: string | number }

type DistributiveOmit<Type, Keys extends keyof any> = Type extends any
	? Omit<Type, Keys>
	: never

// --- Prop and Component Type Computations ---

// 1. Combine BaseProps with Variant and Var props, omitting collisions
// This definition remains the same, as it's generic on `Props`.
export type StyledOutProps<
	Props, // The *original* props
	TConfig extends StyledConfig,
> = DistributiveOmit<
	Props,
	keyof GetVariantProps<TConfig> | keyof GetVarProps<TConfig>
> &
	GetVariantProps<TConfig> &
	GetVarProps<TConfig>

// 2. Define the *output* component type (Simple `restyle` version)
// This is a simple function type, generic on the final props.
export type StyledComponent<Props> = (
	props: Props & {
		className?: string // Ensure className is always available
	},
) => JSX.Element

// 3. Helper type for FunctionComponent (from `restyle` example)
// This allows us to type the `Component` argument correctly.
export type FunctionComponent<Props> = (
	props: Props,
) => ReactNode | Promise<ReactNode>
