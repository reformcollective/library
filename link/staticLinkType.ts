import type { CustomLinkType } from "sanity-plugin-link-field"

import { LinkIcon } from "@sanity/icons"
import { compileTime } from "library/compile-time"
import { listStaticRoutes } from "library/list-pages"

import { staticPageLinkType } from "./resolve"

type StaticLinkOption = {
	title: string
	value: string
}

const staticPageOptions = await compileTime(async () => {
	const routes = await listStaticRoutes()

	return routes.map((route) => ({
		title: route,
		value: route,
	}))
})

export function staticLinkType(options = staticPageOptions): CustomLinkType {
	return {
		title: "Static Page",
		value: staticPageLinkType,
		icon: LinkIcon,
		description: "Link to a hardcoded route in the app.",
		options: options satisfies StaticLinkOption[],
	}
}
