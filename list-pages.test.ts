import { describe, expect, test } from "vitest"
import { isDynamicRoutePath, pageFilePathToRoute } from "./list-pages"

describe("static route listing helpers", () => {
	test("treats dynamic segments as dynamic unless a segment value is provided", () => {
		expect(isDynamicRoutePath("app/[site]/text-demo/page.tsx")).toBe(true)
	})

	test("keeps catch-all and document dynamic routes out of static routes", () => {
		expect(isDynamicRoutePath("app/[site]/[[...slug]]/page.tsx")).toBe(true)
		expect(isDynamicRoutePath("app/[site]/products/[slug]/page.tsx")).toBe(true)
	})

	test("substitutes configured dynamic segment values", () => {
		const segments = { site: "temple" }

		expect(isDynamicRoutePath("app/[site]/text-demo/page.tsx", segments)).toBe(
			false,
		)
		expect(pageFilePathToRoute("app/[site]/text-demo/page.tsx", segments)).toBe(
			"/temple/text-demo",
		)
	})
})
