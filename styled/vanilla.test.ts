import type { StyleRule } from "node_modules/@vanilla-extract/css/dist/vanilla-extract-css.cjs"

import { expect, test, vi } from "vitest"

vi.mock("./breakpoints.css", () => ({
	isDesktop: "var(--is-desktop)",
	isFull: "var(--is-full)",
	isMobile: "var(--is-mobile)",
	isTablet: "var(--is-tablet)",
}))

const css = String.raw

const getGeneratedCss = (rule: StyleRule) => Object.values(rule).join("")

test("responsive utilities preserve pixels marked with neverResponsive", async () => {
	const { f, neverResponsive } = await import("./vanilla")
	const generated = getGeneratedCss(
		f.responsive(
			css`
				padding: 20px;
				${neverResponsive(css`
					font-size: 16px;
					line-height: 20px;
				`)}
			`,
			{ engine: "calc" },
		),
	)

	expect(generated).toContain("padding:calc(")
	expect(generated).toContain("font-size:16px")
	expect(generated).toContain("line-height:20px")
	expect(generated).not.toContain("neverpx")
})

test("media engine preserves pixels marked with neverResponsive", async () => {
	const { f, neverResponsive } = await import("./vanilla")
	const generated = getGeneratedCss(
		f.responsive(
			css`
				margin: 20px;
				${neverResponsive(css`
					font-size: 16px;
				`)}
			`,
			{ engine: "media" },
		),
	)

	expect(generated).toContain("margin:")
	expect(generated).toContain("font-size:16px")
	expect(generated).not.toContain("neverpx")
})
