import { describe, expect, test, vi } from "vitest"

async function importListPagesWithRoutes(routes: string[]) {
	vi.resetModules()
	vi.doMock("node:fs/promises", () => ({
		glob: async function* () {
			yield* routes
		},
	}))

	return await import("./list-pages")
}

describe("static route listing helpers", () => {
	test("treats dynamic segments as dynamic", async () => {
		const { isDynamicRoutePath } = await importListPagesWithRoutes([])

		expect(isDynamicRoutePath("app/[site]/text-demo/page.tsx")).toBe(true)
	})

	test("keeps catch-all and document dynamic routes out of static routes", async () => {
		const { isDynamicRoutePath } = await importListPagesWithRoutes([])

		expect(isDynamicRoutePath("app/[site]/[[...slug]]/page.tsx")).toBe(true)
		expect(isDynamicRoutePath("app/[site]/products/[slug]/page.tsx")).toBe(true)
	})

	test("converts page file paths to route patterns", async () => {
		const { pageFilePathToRoute } = await importListPagesWithRoutes([])

		expect(pageFilePathToRoute("app/(shop)/[site]/text-demo/page.tsx")).toBe(
			"/[site]/text-demo",
		)
	})

	test("lists only fully static routes", async () => {
		const { listStaticRoutes } = await importListPagesWithRoutes([
			"app/(shop)/about/page.tsx",
			"app/(shop)/about/page.tsx",
			"app/[site]/shop/page.tsx",
			"app/[site]/[[...slug]]/page.tsx",
			"app/visual-tests/page.tsx",
		])

		expect(listStaticRoutes()).toEqual(["/about", "/visual-tests"])
	})

	test("substitutes simple dynamic segment values", async () => {
		const { listRoutes } = await importListPagesWithRoutes([
			"app/[site]/account/page.tsx",
			"app/[site]/shop/page.tsx",
			"app/[site]/[[...slug]]/page.tsx",
			"app/[site]/products/[slug]/page.tsx",
			"app/sample-form/page.tsx",
		])

		expect(listRoutes({ site: "temple" })).toEqual([
			"/sample-form",
			"/temple/account",
			"/temple/shop",
		])
	})

	test("rejects invalid segment values", async () => {
		const { listRoutes } = await importListPagesWithRoutes([
			"app/[site]/shop/page.tsx",
		])

		expect(() => listRoutes({ site: "" })).toThrow("must not be empty")
		expect(() => listRoutes({ site: "temple/shop" })).toThrow(
			"single path segment",
		)
	})
})
