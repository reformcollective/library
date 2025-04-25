import { usePageTransition } from "./usePageTransition"
import { usePreloader } from "./usePreloader"

/**
 * track if any loader is currently in progress
 *
 * this includes both the preloader and page transitions
 */
export const useLoadInProgress = () => {
	const { completed } = usePreloader()
	const { isAnimating } = usePageTransition()

	return {
		inProgress: !completed || isAnimating,
		completed: completed && !isAnimating,
	}
}
