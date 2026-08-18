"use client"

import { usePathname } from "next/navigation"
import { createContext, use, useEffect, useState } from "react"
import { loader } from "./loader"

type PageTransition = {
	animateBefore?: () => Promise<void> | void
	animateAfter?: () => Promise<void> | void
}

export const TransitionsContext = createContext({
	animations: new Set<PageTransition>(),
	isAnimating: false as "before" | "after" | false,
	setIsAnimating: (_isAnimating: false | "before" | "after") => {},
})

export const PageTransitionProvider = ({
	children,
}: {
	children: React.ReactNode
}) => {
	const [isAnimating, setIsAnimating] = useState<false | "before" | "after">(
		false,
	)
	const [animations] = useState(() => new Set<PageTransition>())

	return (
		<TransitionsContext.Provider
			value={{ animations, isAnimating, setIsAnimating }}
		>
			{children}
		</TransitionsContext.Provider>
	)
}

/**
 * Signals that the current page's real content (not just a Suspense fallback
 * mid-route-swap) has committed to the DOM. Render this once inside a page's
 * resolved content — e.g. as the last thing returned by an async Server
 * Component — so `waitForPageCommit()` only resolves once there's actually
 * something to show, instead of firing on every pathname change regardless
 * of whether the new page's data has loaded yet.
 */
export const PageCommitSignal = () => {
	const pathname = usePathname()

	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is only a re-run trigger, not read in the effect
	useEffect(() => {
		loader.dispatchEvent("pageCommit", pathname)
	}, [pathname])

	return null
}

export const usePageTransition = (transition: PageTransition = {}) => {
	const { animations, isAnimating } = use(TransitionsContext)

	useEffect(() => {
		animations.add(transition)

		return () => {
			animations.delete(transition)
		}
	}, [animations, transition])

	return { isAnimating }
}
