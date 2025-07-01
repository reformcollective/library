import { usePageTransition } from "./usePageTransition"
import { usePreloader } from "./usePreloader"

/**
 * track if any loader is currently in progress
 *
 * this includes both the preloader and page transitions
 */
export const useLoadState = () => {
	const { completed: preloaderFinished } = usePreloader()
	const { isAnimating: pageTransitionInProgress } = usePageTransition()

	const entering = !preloaderFinished || pageTransitionInProgress === "after"
	const leaving = pageTransitionInProgress === "before"
	const completed = preloaderFinished

	return {
		entering,
		leaving,
		completed,
		idle: !entering && !leaving,
	}
}
