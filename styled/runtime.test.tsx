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
