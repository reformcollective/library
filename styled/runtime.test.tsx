import { expect, test } from "vitest"
import { runtimeStyled } from "./runtime"

test("runtimeStyled component toString() returns class selector for use in selectors", () => {
	const Child = runtimeStyled({ tag: "span", cvaBase: "child_class_abc123" })
	expect(Child.toString()).toBe(".child_class_abc123")
})
