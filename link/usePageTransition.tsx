import { usePathname } from "next/navigation"
import { createContext, Suspense, use, useEffect, useState } from "react"
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
			<Suspense fallback={null}>
				<PageTransitionCommit />
			</Suspense>
			<Suspense fallback={null}>{children}</Suspense>
		</TransitionsContext.Provider>
	)
}

function PageTransitionCommit() {
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
