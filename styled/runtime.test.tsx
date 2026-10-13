import type { ComponentProps } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"
import { runtimeStyled } from "./runtime"
import { withComponent } from "./withComponent"

test("runtimeStyled component toString() returns class selector for use in selectors", () => {
	const Child = runtimeStyled({ tag: "span", cvaBase: "child_class_abc123" })
	expect(Child.toString()).toBe(".child_class_abc123")
})

test("withComponent wrapper toString() delegates to the raw styled component", () => {
	const Raw = runtimeStyled({ tag: "span", cvaBase: "raw_class_abc123" })
	const Wrapped = withComponent(() => null, Raw)

	expect(Wrapped.toString()).toBe(".raw_class_abc123")
})

test("withComponent wrapper renders the wrapped component, unless an as prop overrides it", () => {
	// the split loader always creates the raw component with a "div" tag
	const Raw = runtimeStyled({ tag: "div", cvaBase: "raw_class_abc123" })
	const Link = (props: unknown) => <a {...(props as ComponentProps<"a">)} />
	const Wrapped = withComponent(Link, Raw)

	expect(renderToStaticMarkup(<Wrapped>text</Wrapped>)).toBe(
		'<a class="raw_class_abc123">text</a>',
	)
	expect(renderToStaticMarkup(<Wrapped as="span">text</Wrapped>)).toBe(
		'<span class="raw_class_abc123">text</span>',
	)
})
