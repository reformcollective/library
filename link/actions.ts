import TypedEventEmitter from "library/TypedEventEmitter"

/**
 * fires when an action link is clicked, keyed by the action's name
 * @see actionLinkType
 */
export const linkActions = new TypedEventEmitter<
	Record<string, [value: string]>
>()

/**
 * run a handler whenever an action link with this name is clicked
 */
export const useLinkAction = (name: string, handler: (value: string) => void) =>
	linkActions.useEventListener(name, handler)
