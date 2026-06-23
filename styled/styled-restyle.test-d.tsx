import { Component, type FC } from "react"
import { expectTypeOf, test } from "vitest"

import { styled } from "./index"
import type { StyledComponent } from "./types"

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

test("additional property types are added", () => {
	const component = ({
		className,
		name,
	}: {
		className: string
		name: string
	}) => <div className={className}>{name}</div>
	const extended = styled(component, {
		variants: { color: { red: [{ color: "red" }] } },
	})

	expectTypeOf(extended).toExtend<
		FC<{
			className: string
			name: string
			color: "red"
		}>
	>()

	const extended2 = styled("div", {
		variants: { color: { orange: [{ color: "orange" }] } },
	})

	expectTypeOf(extended2).toExtend<FC<{ color: "orange" }>>()
})

test("style props are filtered from the component props", () => {
	const component = ({
		className,
		color,
	}: {
		className: string
		color?: number
	}) => <div className={className}>{color}</div>
	const extended = styled(component, {
		variants: { color: { red: [{ color: "red" }] } },
	})

	expectTypeOf(extended).toExtend<
		StyledComponent<{
			className: string
			color: number & "red"
		}>
	>()

	const extended2 = styled("button", {
		variants: { color: { red: [{ color: "red" }] } },
	})

	expectTypeOf(extended2).toExtend<
		FC<{
			color: "red"
			disabled?: boolean
		}>
	>()
})

test("style props are allowed to override the component type", () => {
	const component = ({
		className,
		color,
	}: {
		className: string
		color: number
	}) => <div className={className}>{color}</div>

	const Component = styled(component, {
		variants: { color: { red: [{ color: "red" }] } },
	})

	const _App = () => <Component className="abc" color="red" />
})

test("extra properties are not allowed", () => {
	const Component = ({ className }: { className: string }) => (
		<div className={className} />
	)
	const Extended = styled(Component, { color: "red" })
	const ExtendedWithProps = styled(Extended, {
		variants: { color: { red: [{ color: "red" }] } },
	})

	const _basicTest = (
		<Extended
			className="abc"
			// @ts-expect-error name does not exist on type
			name="abc"
		/>
	)
	const _propsTest = (
		<ExtendedWithProps
			className="abc"
			// @ts-expect-error name does not exist on type
			name="abc"
			color="red"
		/>
	)

	const Extended2 = styled("div", { color: "red" })
	const ExtendedWithProps2 = styled(Extended2, {
		variants: { color: { red: [{ color: "red" }] } },
	})

	const _basicTest2 = (
		<Extended2
			className="abc"
			// @ts-expect-error name does not exist on type
			name="abc"
		/>
	)
	const _propsTest2 = (
		<ExtendedWithProps2
			className="abc"
			// @ts-expect-error name does not exist on type
			name="abc"
			color="red"
		/>
	)
})

declare module "react" {
	namespace JSX {
		interface IntrinsicElements {
			disallowed: { color: string }
		}
	}
}

test("component is required to have a className prop", () => {
	const withClassName = (_props: { className?: string }) => <div />
	const withoutClassName = (_props: { color: string }) => <div />

	// allowed
	styled(withClassName, {})
	styled("div", {})

	const _test = (
		<>
			<disallowed color="red" />
		</>
	)

	// not allowed
	// @ts-expect-error
	styled(withoutClassName)
	// @ts-expect-error
	styled("disallowed")
})

test("generic types are preserved without style props", () => {
	const Component = <SomeText extends string>(_props: {
		id: `id-${SomeText}`
		one: NoInfer<SomeText>
		two: NoInfer<SomeText>
		className?: string
	}) => <></>
	const Extended = styled(Component, {})

	const _test = (
		<>
			<Component<"abc"> id="id-abc" one="abc" two="abc" />
			<Extended<"abc"> id="id-abc" one="abc" two="abc" />
		</>
	)
	Component({
		id: "id-abc",
		one: "abc",
		// @ts-expect-error types require 'abc'
		two: "xyz",
	})
	Extended({
		id: "id-abc",
		one: "abc",
		// @ts-expect-error types require 'abc'
		two: "xyz",
	})
})

test("generic types are preserved with style props", () => {
	const Component = <SomeText extends string>(_props: {
		id: `id-${SomeText}`
		one: NoInfer<SomeText>
		two: NoInfer<SomeText>
		className?: string
	}) => <></>
	const Extended = styled(Component, {
		variants: { color: { red: [{ color: "red" }] } },
	})

	const _test = (
		<>
			<Component<"abc"> id="id-abc" one="abc" two="abc" />
			<Extended<"abc"> id="id-abc" one="abc" two="abc" color="red" />
		</>
	)
	Component({
		id: "id-abc",
		one: "abc",
		// @ts-expect-error types require 'abc'
		two: "xyz",
	})
	Extended({
		color: "red",
		id: "id-abc",
		one: "abc",
		// @ts-expect-error types require 'abc'
		two: "xyz",
	})
})

test("generic types are preserved even when partially overwritten by style props", () => {
	const component = <SomeText extends string>(_props: {
		id: `id-${SomeText}`
		one?: NoInfer<SomeText>
		two: NoInfer<SomeText>
		className?: string
	}) => <></>
	const extended = styled(component, {
		variants: { one: { red: [{ color: "red" }] } },
	})

	component({
		id: "id-abc",
		one: "abc",
		// @ts-expect-error types require 'abc'
		two: "xyz",
	})
	extended({
		id: "id-abc",
		one: "red",
		// @ts-expect-error types require 'abc'
		two: "xyz",
	})
})

test("generic types with multiple generics are preserved", () => {
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
		variants: { color: { red: [{ color: "red" }] } },
	})

	const _test = (
		<>
			<Component<"abc", "xyz"> id="id-abc-xyz" one="abc" two="xyz" />
			<Extended<"abc", "xyz"> id="id-abc-xyz" one="abc" two="xyz" color="red" />
		</>
	)
	Component({
		id: "id-abc-xyz",
		one: "abc",
		// @ts-expect-error types require 'abc'
		two: "abc",
	})
	Extended({
		color: "red",
		id: "id-abc-xyz",
		one: "abc",
		// @ts-expect-error types require 'abc'
		two: "abc",
	})
})

test("class components work", () => {
	class WithClass extends Component<{ className?: string }> {
		override render() {
			return <div className={this.props.className} />
		}
	}
	const Extended = styled(WithClass, { color: "red" })

	const _test = (
		<>
			<Component className="abc" />
			<Extended className="abc" />
		</>
	)
})

test("components that return non-element react nodes are allowed", () => {
	const NullComponent = (_props: { className: string }) => null
	const _NullExtended = styled(NullComponent, { color: "red" })
	const StringComponent = (_props: { className: string }) => "abc"
	const _StringExtended = styled(StringComponent, { color: "red" })
	const NumberComponent = (_props: { className: string }) => 123
	const _NumberExtended = styled(NumberComponent, { color: "red" })
})

test("async components are allowed", () => {
	const Component: (props: {
		className?: string
	}) => Promise<React.ReactNode> = () => Promise.resolve(null)
	const _Extended = styled(Component, { color: "red" })
})

test("unions are not broken", () => {
	type ButtonProps = {
		type: "submit" | "button" | "reset"
		onClick?: VoidFunction
		className?: string
	}

	type AnchorProps = {
		href: string | null | undefined
		className?: string
	}

	type LinkProps = ButtonProps | AnchorProps

	const Test: FC<LinkProps> = () => null
	const Extended = styled(Test, {
		variants: {
			active: { true: [{ color: "red" }], false: [{ color: "blue" }] },
		},
	})

	const _test = (
		<>
			<Test href="test" />
			<Test type="button" onClick={() => {}} />
			<Extended href="test" active />
			<Extended type="button" onClick={() => {}} active />
		</>
	)
})
