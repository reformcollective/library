"use client"

import { usePathname } from "next/navigation"
import { createContext, use, useEffect, useState } from "react"
import { loader, type TransitionEventPayload } from "./loader"

/**
 * both callbacks receive the same payload as the loader events, so a
 * transition can branch on `transition.name` (the `transitionName` passed to
 * the transitioner) to pick an animation for this navigation
 */
type PageTransition = {
	animateBefore?: (transition: TransitionEventPayload) => Promise<void> | void
	animateAfter?: (transition: TransitionEventPayload) => Promise<void> | void
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

/** Fires `pageCommit` once real page content has rendered. Render inside the page's resolved content. */
export const PageCommitSignal = () => {
	const pathname = usePathname()

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
