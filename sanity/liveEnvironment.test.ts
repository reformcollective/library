import { afterEach, beforeEach, expect, test } from "vitest"

import {
	fluidComputeUnavailableEnvironmentVariables,
	getLiveProxySupport,
	isLocalSiteURL,
	isNextProductionBuild,
} from "./liveEnvironment"

const originalEnv = process.env

beforeEach(() => {
	process.env = { ...originalEnv }
})

afterEach(() => {
	process.env = originalEnv
})

function setEnv(env: Partial<NodeJS.ProcessEnv>) {
	process.env = { ...originalEnv, ...env }
}

test("detects local site URLs", () => {
	expect(isLocalSiteURL("http://localhost:3000")).toBe(true)
	expect(isLocalSiteURL("http://127.0.0.1:3000")).toBe(true)
	expect(isLocalSiteURL("http://[::1]:3000")).toBe(true)
	expect(isLocalSiteURL("https://example.com")).toBe(false)
})

test("detects Next production builds", () => {
	setEnv({ NEXT_PHASE: "phase-production-build" })

	expect(isNextProductionBuild()).toBe(true)
})

test("ignores other Next phases", () => {
	setEnv({ NEXT_PHASE: "phase-production-server" })

	expect(isNextProductionBuild()).toBe(false)
})

test("allows the live proxy for local site URLs", () => {
	setEnv({ NODE_ENV: "production", VERCEL: undefined })

	expect(getLiveProxySupport({ currentSiteURL: "http://localhost:3000" }).canUseLiveProxy).toBe(
		true,
	)
})

test("disables the live proxy when config opts out", () => {
	setEnv({ NODE_ENV: "production", VERCEL: undefined })

	const support = getLiveProxySupport({
		allowProxy: false,
		currentSiteURL: "http://localhost:3000",
	})

	expect(support.allowProxy).toBe(false)
	expect(support.runtimeSupportsLiveProxy).toBe(true)
	expect(support.canUseLiveProxy).toBe(false)
})

test("allows the live proxy on Vercel Fluid Compute", () => {
	setEnv({ NODE_ENV: "production", VERCEL: "1" })
	for (const variable of fluidComputeUnavailableEnvironmentVariables) {
		delete process.env[variable]
	}

	const support = getLiveProxySupport({
		currentSiteURL: "https://example.vercel.app",
	})

	expect(support.isVercelFluidCompute).toBe(true)
	expect(support.canUseLiveProxy).toBe(true)
})

test("blocks the live proxy on Vercel without Fluid Compute", () => {
	setEnv({
		AWS_LAMBDA_RUNTIME_API: "127.0.0.1:9001",
		NODE_ENV: "production",
		VERCEL: "1",
	})

	const support = getLiveProxySupport({
		currentSiteURL: "https://example.vercel.app",
	})

	expect(support.isVercelFluidCompute).toBe(false)
	expect(support.canUseLiveProxy).toBe(false)
})

test("blocks the live proxy outside Vercel production", () => {
	setEnv({ NODE_ENV: "production", VERCEL: undefined })

	expect(getLiveProxySupport({ currentSiteURL: "https://example.com" }).canUseLiveProxy).toBe(false)
})
