import { BoltIcon } from "@sanity/icons"
import type { CustomLinkType } from "sanity-plugin-link-field"
import { actionLinkPrefix } from "./resolve"

/**
 * a link type that triggers an action (e.g. opening a modal) instead of navigating.
 * the chosen option's value is dispatched to `useLinkAction(name, ...)` listeners.
 *
 * @example
 * // sanity.config.ts
 * linkField({
 * 	customLinkTypes: [
 * 		actionLinkType({ name: "video", title: "Video Popup", options: async () => videoOptions }),
 * 	],
 * })
 *
 * // app
 * useLinkAction("video", (videoId) => open(videoId))
 */
export function actionLinkType({
	name,
	title,
	description,
	icon = BoltIcon,
	options,
}: {
	name: string
	title: string
	description?: string
	icon?: CustomLinkType["icon"]
	options: CustomLinkType["options"]
}): CustomLinkType {
	return {
		title,
		value: `${actionLinkPrefix}${name}`,
		icon,
		description,
		options,
	}
}
