import { style } from "@vanilla-extract/css"
import { styled } from "library/styled"
import { Component, type ComponentProps, type FC } from "react"
import { expectTypeOf, test } from "vitest"

test("vanilla extract should be strict", () => {
	style({
		// @ts-expect-error not a css property
		skibidi: "toilet",
	})
})

test("basic component type is preserved", () => {
	const component = ({
		className,
		name,
	}: {
		className: string
		name: string
	}) => <div className={className}>{name}</div>
	const extended = styled(component, {})

	expectTypeOf(extended).toExtend<typeof component>()
})

// ---------- variants: unions, boolean, required vs optional ----------

test("variants with defaults are optional; without defaults are required", () => {
	const StyledButton = styled("button", {
		base: [{ display: "inline-flex" }],
		variants: {
			color: {
				primary: [{ color: "white", background: "#0070f3" }],
				secondary: [{ color: "white", background: "#555" }],
			},
			size: {
				small: [{ fontSize: "12px" }],
				large: [{ fontSize: "18px" }],
			},
		},
		defaultVariants: { color: "primary", size: "small" },
	})

	// should compile: defaults make these props optional
	const _ok1 = <StyledButton>Default</StyledButton>
	const _ok2 = <StyledButton color="secondary">Secondary</StyledButton>
	const _ok3 = <StyledButton size="large">Large</StyledButton>
	const _ok4 = (
		<StyledButton color="secondary" size="large">
			Both
		</StyledButton>
	)

	const NoDefault = styled("div", {
		variants: {
			tone: {
				brand: [{ color: "#0af" }],
				neutral: [{ color: "#ccc" }],
			},
		},
		// no defaults
	} as const)

	// @ts-expect-error: 'tone' required (no default)
	const _err1 = <NoDefault />

	const _ok5 = <NoDefault tone="brand" />
	const _ok6 = <NoDefault tone="neutral" />

	// type-level assertions
	type SBProps = ComponentProps<typeof StyledButton>
	expectTypeOf<SBProps["color"]>().toEqualTypeOf<
		"primary" | "secondary" | undefined
	>()
	expectTypeOf<SBProps["size"]>().toEqualTypeOf<"small" | "large" | undefined>()

	type NDProps = ComponentProps<typeof NoDefault>
	// if tone has no default, it should be required (no undefined in the type)
	// we check indirectly by ensuring omitting produces an error above (err1)
	expectTypeOf<NDProps["tone"]>().toEqualTypeOf<"brand" | "neutral">()
})

test("default prop types are preserved", () => {
	const Button = styled("button", {
		base: [{ display: "inline-flex" }],
		variants: {
			color: {
				primary: [{ color: "white", background: "#0070f3" }],
				secondary: [{ color: "white", background: "#555" }],
			},
		},
		defaultVariants: { color: "primary" },
	} as const)

	const _ok1 = <Button onClick={() => {}}>Default</Button>
	const _ok2 = (
		<Button color="secondary" onClick={() => {}}>
			Secondary
		</Button>
	)
})

test("boolean variants are typed as boolean; optional when default exists", () => {
	const Advanced = styled("div", {
		variants: {
			active: {
				true: [{ background: "#68d391" }],
				false: [{ background: "#6b7280" }],
			},
		},
		defaultVariants: { active: false },
	} as const)

	const _ok1 = <Advanced>inactive by default</Advanced>
	const _ok2 = <Advanced active>active</Advanced>
	const _ok3 = <Advanced active={false}>inactive</Advanced>

	type P = ComponentProps<typeof Advanced>
	expectTypeOf<P["active"]>().toEqualTypeOf<boolean | undefined>()

	const RequiredBool = styled("div", {
		variants: {
			on: {
				true: [{ opacity: 1 }],
				false: [{ opacity: 0.5 }],
			},
		},
	} as const)

	// @ts-expect-error: missing required boolean variant 'on'
	const _err1 = <RequiredBool />

	const _ok4 = <RequiredBool on />
	const _ok5 = <RequiredBool on={false} />

	type RP = ComponentProps<typeof RequiredBool>
	expectTypeOf<RP["on"]>().toEqualTypeOf<boolean>()
})

// ---------- tokens: prop typing and units ----------

test("tokens yield string | number props; units permit numeric values", () => {
	const Box = styled("div", {
		base: [{ border: "1px solid #333" }],
		tokens: {
			height: { token: "var(--h)", unit: "px" },
			width: "var(--w)", // string or number, no unit coercion
		},
	} as const)

	const _ok1 = <Box height={100} width="50%" />
	const _ok2 = <Box height={200} width={300} />
	const _ok3 = <Box height={"120px"} width={120} />

	type BP = ComponentProps<typeof Box>
	expectTypeOf<BP["height"]>().toEqualTypeOf<string | number | undefined>()
	expectTypeOf<BP["width"]>().toEqualTypeOf<string | number | undefined>()
})

// ---------- no `as` prop exposed (runtime-only) ----------

test("no `as` prop in the type surface", () => {
	const Div = styled("div", { base: [{ padding: "4px" }] } as const)
	// @ts-expect-error: as is not part of the typed API
	const _err = <Div as="a" />
	const _ok = <Div />
})

// ---------- union targets preserved ----------

test("union component targets are preserved after styling", () => {
	type ButtonProps = {
		type: "submit" | "button" | "reset"
		onClick?: VoidFunction
		className?: string
	}

	type AnchorProps = {
		href: string | null | undefined
		className?: string
	}

	const Link: FC<ButtonProps | AnchorProps> = () => null

	const StyledLink = styled(Link, {
		base: [{ display: "inline-flex" }],
	} as const)

	const _ok1 = <StyledLink href="test" />
	const _ok2 = <StyledLink type="button" onClick={() => {}} />
})

// ---------- class components work ----------

test("class components work as targets (need className?)", () => {
	class WithClass extends Component<{ className?: string }> {
		override render() {
			return <div className={this.props.className} />
		}
	}
	const Extended = styled(WithClass, { base: [{ color: "red" }] } as const)

	const _ok = <Extended className="abc" />
})

// ---------- negative: forbid resolver-only features today ----------

test("function-style resolver config is not accepted today (guarded for now)", () => {
	const C = (_p: { className?: string }) => <div />
	// @ts-expect-error function-form config not supported by current API
	const _Bad = styled(C, (styleProps: { color: string }) => ({
		color: styleProps.color,
	}))
	// @ts-expect-error function-form config not supported by current API
	const _Bad2 = styled("div", (styleProps: { color: string }) => ({
		color: styleProps.color,
	}))
})

// ---------- mixed required/optional variants ----------

test("mixed: some variants optional (defaulted), others required", () => {
	const Mixed = styled("div", {
		variants: {
			tone: { brand: [{}], neutral: [{}] }, // no default → required
			size: { small: [{}], large: [{}] }, // default → optional
		},
		defaultVariants: { size: "small" },
	} as const)

	// @ts-expect-error: 'tone' required
	const _e1 = <Mixed />
	const _ok1 = <Mixed tone="brand" />
	const _ok2 = <Mixed tone="neutral" size="large" />
})

// ---------- variant/native prop collision ----------

test("variant keys shadow native props of the same name", () => {
	const Btn = styled("button", {
		variants: {
			size: { small: [{}], large: [{}] },
		},
		defaultVariants: { size: "small" },
	} as const)

	const _ok1 = <Btn size="large" />
	// @ts-expect-error: native numeric size is not allowed; variant union required
	const _e1 = <Btn size={3} />
})

// ---------- component targets must accept className ----------

test("component targets must accept className", () => {
	const NoClass = (_p: { id: string }) => <div />
	styled("figure", { base: [{}] })
	// @ts-expect-error component targets must accept className
	const _Bad = styled(NoClass, { base: [{}] } as const)
})

// ---------- DOM prop forwarding sanity ----------

test("unrelated DOM props still forward", () => {
	const Btn = styled("button", { base: [{}] } as const)
	const _ok = <Btn disabled aria-label="x" />
})

// ---------- selector via toString() ----------

test("styled components return a class selector when stringified", () => {
	const WrapperWithToString = styled("div", "")
	expectTypeOf(WrapperWithToString.toString()).toExtend<string>()
})

// ---------- Base UI Field.Control + styled ----------

test("type is preserved when className is unconventional", () => {
	const CustomComponent = (() =>
		null) as unknown as React.ForwardRefExoticComponent<
		{
			type?: string
			onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
			className?: string | ((state: { checked: boolean }) => string | undefined)
		} & React.RefAttributes<HTMLInputElement>
	>
	const StyledInput = styled(CustomComponent, {
		base: [{ padding: "4px" }],
	})

	const _ok = (
		<>
			<CustomComponent
				type="text"
				onChange={(_event) => null}
				className="custom"
			/>
			<StyledInput type="text" onChange={(_event) => null} className="custom" />
			<CustomComponent
				type="text"
				onChange={(_event) => null}
				className={(state) => (state.checked ? "enabled" : "disabled")}
			/>
			<StyledInput
				type="text"
				onChange={(_event) => null}
				className={(state) => (state.checked ? "enabled" : "disabled")}
			/>
		</>
	)
})

// ---------- generics preservation with variants ----------

test.fails("generic types are preserved with variants config", () => {
	const Component = <SomeText extends string>(_props: {
		id: `id-${SomeText}`
		one: NoInfer<SomeText>
		two: NoInfer<SomeText>
		className?: string
	}) => <></>

	const Extended = styled(Component, {
		base: [{}],
		variants: {
			tone: { brand: [{}], neutral: [{}] },
		},
		defaultVariants: { tone: "brand" },
	} as const)

	const _ok = (
		<>
			<Component<"abc"> id="id-abc" one="abc" two="abc" />
			<Extended<"abc"> id="id-abc" one="abc" two="abc" />
			<Extended<"abc"> id="id-abc" one="abc" two="abc" tone="neutral" />
		</>
	)
})

// ---------- generics preservation with tokens config ----------

test.fails("generic types are preserved with tokens config", () => {
	const Component = <SomeText extends string>(_props: {
		id: `id-${SomeText}`
		one: NoInfer<SomeText>
		two: NoInfer<SomeText>
		className?: string
	}) => <></>

	const Extended = styled(Component, {
		base: [{}],
		tokens: { height: "var(--h)", width: { token: "var(--w)", unit: "px" } },
	} as const)

	const _ok = (
		<>
			<Component<"abc"> id="id-abc" one="abc" two="abc" />
			<Extended<"abc"> id="id-abc" one="abc" two="abc" height={100} />
			<Extended<"abc"> id="id-abc" one="abc" two="abc" width="50%" />
		</>
	)
})

// ---------- generics with multiple generics and variants ----------

test.fails("generic types with multiple generics are preserved with variants", () => {
	const Component = <
		SomeText extends string,
		AnotherText extends string,
	>(_props: {
		id: `id-${SomeText}-${AnotherText}`
		one: NoInfer<SomeText>
		two: NoInfer<AnotherText>
		className?: string
	}) => <></>

	const Extended = styled(Component, {
		base: [{}],
		variants: { size: { small: [{}], large: [{}] } },
		defaultVariants: { size: "small" },
	} as const)

	const _ok = (
		<>
			<Component<"a", "b"> id="id-a-b" one="a" two="b" />
			<Extended<"a", "b"> id="id-a-b" one="a" two="b" />
			<Extended<"a", "b"> id="id-a-b" one="a" two="b" size="large" />
		</>
	)
})

// test("errors on config are reported in the right place", () => {
// 	const SmokeBox = styled(
// 		// no error here
// 		"div",
// 		{
// 			base: {
// 				border: "2px solid black",
// 			},
// 			variants: {
// 				color: {
// 					red: [{ color: "red" }],
// 					blue: [
// 						{
// 							color: "blue",
// 							// @ts-expect-error not a valid css prop
// 							skibidi: "toilet",
// 						},
// 					],
// 				},
// 				isLarge: {
// 					true: [{ fontSize: "24px" }],
// 					false: [{ fontSize: "16px" }],
// 				},
// 			},
// 			// @ts-expect-error: not a valid option
// 			skib: true,
// 			tokens: {
// 				// required by default
// 				paddingMultiplier: {
// 					token: "var(--padding-multiplier)",
// 					unit: "px",
// 					// @ts-expect-error not a valid variable option
// 					skib: true,
// 				},
// 				// optional
// 				innerColor: {
// 					token: "var(--inner-color)",
// 					optional: true,
// 				},
// 			},
// 			defaultVariants: {
// 				// @ts-expect-error: not a valid option for this variant
// 				isLarge: "skibidi",
// 				color: "red",
// 				// @ts-expect-error: not a variant
// 				size: "small",
// 			},
// 			compoundVariants: [
// 				{
// 					color: "red",
// 					// @ts-expect-error not a variant
// 					orange: "peel",
// 					style: "ok",
// 				},
// 			],
// 		},
// 	)

// 	const SmokeBox2 = styled("div", {
// 		base: {
// 			border: "2px solid black",
// 		},
// 		// @ts-expect-error: not valid!
// 		skib: true,
// 	})
// })
