import TypedEventEmitter from "library/TypedEventEmitter"
import type { TransitionNames } from "libraryConfig"

/**
 * transitionNames are configured in src/libraryConfig.ts
 * you should't need to edit this file
 */
export type Transitions = TransitionNames | "instant"
export type AllTransitions = Transitions | "initial"

export const loader = new TypedEventEmitter<{
	/**
	 * when the animation begins, i.e. when the page is loaded but the preloader is still fully visible
	 */
	start: [AllTransitions]
	/**
	 * when the animation ends, e.g. when the page is fully loaded and the preloader is hidden
	 */
	end: [AllTransitions]
	/**
	 * fires when the route changes. this occurs in between the start and end events
	 */
	routeChange: [AllTransitions]
	/**
	 * fires when clicking a link that is the current page or when clicking an anchor
	 * @param transitionName the name of the anchor that was clicked if available
	 */
	scroll: [string | null]
	/**
	 * progressUpdated
	 * on the initial page load, this tracks how close the page is to being fully loaded
	 * @param progress the progress value from 0 to 100
	 */
	progressUpdated: [number]
}>(["end"])
