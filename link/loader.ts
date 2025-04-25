import TypedEventEmitter from "library/TypedEventEmitter"

/**
 * transition names are configured in app/libraryConfig.ts
 * you should't need to edit this file
 */
export type Transitions = "animated" | "instant"

export const loader = new TypedEventEmitter<{
	/**
	 * when the animation begins, i.e. when the page is loaded but the preloader is still fully visible
	 */
	start: [Transitions]
	/**
	 * when the animation ends, e.g. when the page is fully loaded and the preloader is hidden
	 */
	end: [Transitions]
	/**
	 * fires when the route changes. this occurs in between the start and end events
	 */
	routeChange: [Transitions]
	/**
	 * fires when clicking a link that is the current page or when clicking an anchor
	 * @param transitionName the name of the anchor that was clicked if available
	 */
	scroll: [string | null]
}>({
	triggerHappyEvents: ["end"],
	resetHappyEvents: ["start", "routeChange"],
})
