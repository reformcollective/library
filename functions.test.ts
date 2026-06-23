import { afterEach, describe, expect, test, vi } from "vitest"

import {
	getRandomFloat,
	getRandomInt,
	linkIsExternal,
	linkIsInternal,
	pathnameMatches,
	sleep,
} from "./functions"

describe("pathnameMatches", () => {
	test("identical paths match", () => {
		expect(pathnameMatches("/about", "/about")).toBe(true)
	})
	test("trailing slash matches in both directions", () => {
		expect(pathnameMatches("/about/", "/about")).toBe(true)
		expect(pathnameMatches("/about", "/about/")).toBe(true)
	})
	test("different paths do not match", () => {
		expect(pathnameMatches("/about", "/contact")).toBe(false)
		expect(pathnameMatches("/a/b", "/a")).toBe(false)
	})
})

describe("linkIsInternal / linkIsExternal (default site http://localhost:3000)", () => {
	test("relative paths are internal", () => {
		expect(linkIsInternal("/about")).toBe(true)
	})
	test("hash links are internal", () => {
		expect(linkIsInternal("#section")).toBe(true)
	})
	test("a different host is external", () => {
		expect(linkIsInternal("https://example.com")).toBe(false)
	})
	test("non-http schemes are external", () => {
		expect(linkIsInternal("mailto:hello@example.com")).toBe(false)
	})
	test("linkIsExternal is the strict inverse", () => {
		for (const to of ["/about", "https://example.com", "mailto:a@b.com"])
			expect(linkIsExternal(to)).toBe(!linkIsInternal(to))
	})
})

describe("linkIsInternal www normalization (custom host)", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.resetModules()
	})
	test("www and apex are the same host", async () => {
		vi.stubEnv("NEXT_PUBLIC_DEPLOY_URL", "https://example.com")
		vi.resetModules()
		const { linkIsInternal: fn } = await import("./functions")
		expect(fn("https://example.com/p")).toBe(true)
		expect(fn("https://www.example.com/p")).toBe(true)
		expect(fn("https://other.com")).toBe(false)
	})
})

describe("getRandomInt", () => {
	test("inclusive bounds over many iterations", () => {
		for (let i = 0; i < 1000; i++) {
			const n = getRandomInt(1, 6)
			expect(n).toBeGreaterThanOrEqual(1)
			expect(n).toBeLessThanOrEqual(6)
			expect(Number.isInteger(n)).toBe(true)
		}
	})
	test("min equals max", () => {
		expect(getRandomInt(5, 5)).toBe(5)
	})
})

describe("getRandomFloat", () => {
	test("within [min, max)", () => {
		for (let i = 0; i < 1000; i++) {
			const n = getRandomFloat(0, 10)
			expect(n).toBeGreaterThanOrEqual(0)
			expect(n).toBeLessThan(10)
		}
	})
})

describe("sleep", () => {
	test("resolves after the delay", async () => {
		vi.useFakeTimers()
		let done = false
		const p = sleep(1000).then(() => {
			done = true
		})
		expect(done).toBe(false)
		await vi.advanceTimersByTimeAsync(1000)
		await p
		expect(done).toBe(true)
		vi.useRealTimers()
	})
})
