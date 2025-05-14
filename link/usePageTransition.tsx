import { createContext, use, useEffect, useMemo, useState } from "react"

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
	const animations = useMemo(() => new Set<PageTransition>(), [])

	return (
		<TransitionsContext.Provider
			value={{ animations, isAnimating, setIsAnimating }}
		>
			{children}
		</TransitionsContext.Provider>
	)
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
