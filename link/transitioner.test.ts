import { afterEach, beforeEach, expect, test, vi } from "vitest"
import type { TransitionEventPayload } from "./loader"
import { loader } from "./loader"
import { useTransitioner } from "./transitioner"

// transitioner is a hook, but the parts under test only need its context, the
// router, and a handful of browser globals, so those are stubbed directly
const router = vi.hoisted(() => ({
	prefetch: () => {},
	push: () => {},
}))
const context = vi.hoisted(() => ({
	animations: new Set<{
		animateBefore?: (transition: never) => Promise<void> | void
		animateAfter?: (transition: never) => Promise<void> | void
	}>(),
	isAnimating: false as const,
	setIsAnimating: () => {},
}))

vi.mock("react", async (importOriginal) => ({
	...(await importOriginal<typeof import("react")>()),
	use: () => context,
	useCallback: <T>(callback: T) => callback,
}))
vi.mock("react-dom", () => ({
	flushSync: (callback: () => void) => callback(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("gsap/all", () => ({ ScrollTrigger: { refresh: () => {} } }))
vi.mock("library/Scroll", () => ({
	createScrollLock: () => ({ release: () => {} }),
}))
vi.mock("./util", () => ({
	getAnchorScrollPosition: () => 0,
	instantScrollToAnchor: async () => {},
	scrollPage: () => {},
}))

beforeEach(() => {
	vi.useFakeTimers()
	router.push = () => loader.dispatchEvent("pageCommit", "/next")
	context.animations.clear()
	vi.stubGlobal("window", {
		location: { origin: "https://example.com", pathname: "/current" },
		history: { pushState: () => {}, replaceState: () => {} },
	})
	vi.stubGlobal("document", { body: { getAnimations: () => [] } })
	vi.stubGlobal("requestAnimationFrame", () => 0)
})

afterEach(() => {
	vi.clearAllTimers()
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

const navigate = async (transitionName?: string) => {
	const transitioner = useTransitioner()
	const done = transitioner({
		e: null,
		to: "/next",
		// transition names are configured per project, so the test casts
		transitionName: transitionName as never,
	})
	await vi.advanceTimersByTimeAsync(100)
	await done
}

test("passes the transition name to registered page transitions", async () => {
	const before = vi.fn<(transition: TransitionEventPayload) => void>()
	const after = vi.fn<(transition: TransitionEventPayload) => void>()
	context.animations.add({ animateBefore: before, animateAfter: after })

	await navigate("fade")

	expect(before).toHaveBeenCalledWith({ type: "animated", name: "fade" })
	expect(after).toHaveBeenCalledWith({ type: "animated", name: "fade" })
})

test("passes the same payload the loader events receive", async () => {
	const before = vi.fn<(transition: TransitionEventPayload) => void>()
	const starts: TransitionEventPayload[] = []
	const onStart = (payload: TransitionEventPayload) => starts.push(payload)
	loader.addEventListener("start", onStart)
	context.animations.add({ animateBefore: before })

	await navigate("slide")
	loader.removeEventListener("start", onStart)

	expect(starts).toEqual([{ type: "animated", name: "slide" }])
	expect(before.mock.calls[0]?.[0]).toEqual(starts[0])
})

test("leaves the name undefined when the navigation has none", async () => {
	const before = vi.fn<(transition: TransitionEventPayload) => void>()
	context.animations.add({ animateBefore: before })

	await navigate()

	expect(before).toHaveBeenCalledWith({ type: "animated", name: undefined })
})

test("still runs transitions that take no arguments", async () => {
	const order: string[] = []
	context.animations.add({
		animateBefore: () => {
			order.push("before")
		},
		animateAfter: async () => {
			order.push("after")
		},
	})

	await navigate("fade")

	expect(order).toEqual(["before", "after"])
})
