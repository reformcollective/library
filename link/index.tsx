"use client"

import Link, { type LinkProps } from "next/link"
import type { ComponentProps, Ref } from "react"
import { linkIsInternal } from "../functions"
import {
	type CMSLink,
	isRouteDefined,
	type LinkHref,
	resolveRoute,
} from "./resolve"
import { buttonClass } from "./styles.css"
import { useTransitioner } from "./transitioner"

export type { CMSLink, LinkHref }
export { isRouteDefined, resolveRoute }

type ButtonProps = {
	/**
	 * what type of button is this?
	 */
	type: "submit" | "button" | "reset"

	href?: undefined
	transition?: undefined
	openInNewTab?: undefined
	onNavigate?: undefined
	onBeforeNavigate?: undefined
} & Omit<ComponentProps<"button">, "type" | "ref">

type AnchorProps = {
	/**
	 * where should the link navigate to?
	 */
	href: LinkHref
	/**
	 * open this link in a new tab?
	 */
	openInNewTab?: boolean
	/**
	 * take action during, or block, an internal navigation
	 * this does not apply to external links
	 */
	onNavigate?: LinkProps<string>["onNavigate"]
	/**
	 * called when the link is clicked, before navigation begins
	 * works for both internal and external links
	 */
	onBeforeNavigate?: () => void
	/**
	 * control Next.js route prefetching for internal links
	 * (e.g. `false` to skip prefetching a route that should not be fetched ahead of a click)
	 */
	prefetch?: LinkProps<string>["prefetch"]

	type?: undefined
} & Omit<ComponentProps<"a">, "href" | "onClick" | "ref">

export type UniversalLinkProps = (ButtonProps | AnchorProps) & {
	ref?:
		| Ref<HTMLButtonElement | null>
		| Ref<HTMLAnchorElement | null>
		| Ref<HTMLButtonElement | HTMLAnchorElement | null>
}

/**
 * a link that navigates when clicked, using the specified transition.
 * @returns
 */
export default function UniversalLink({
	children,
	ref,
	onNavigate,
	onBeforeNavigate,
	openInNewTab,
	...props
}: UniversalLinkProps) {
	const transitioner = useTransitioner()

	if (props.type) {
		const className = props.className
			? `${buttonClass} ${props.className}`
			: buttonClass

		return (
			<button
				{...props}
				className={className}
				ref={ref as Ref<HTMLButtonElement>}
			>
				{children}
			</button>
		)
	}

	const { url, newTab: routeNewTab, download } = resolveRoute(props.href)
	const newTab = openInNewTab ?? routeNewTab
	const internal = url ? linkIsInternal(url) : false

	const onClick = (e: React.MouseEvent) => {
		if (!url) return
		onBeforeNavigate?.()

		if (internal && !newTab) {
			transitioner({ e, to: url })
		} else {
			window.open(url, newTab ? "_blank" : "_self")
		}
	}

	if (!url) return null
	return internal ? (
		<Link
			{...props}
			// biome-ignore lint/suspicious/noExplicitAny: I am very intentionally disabling type checking here because a cast would not be backwards compatible
			href={url as any}
			ref={ref as Ref<HTMLAnchorElement>}
			target={newTab ? "_blank" : undefined}
			download={download}
			onClick={onClick}
			suppressHydrationWarning
			onNavigate={onNavigate}
		>
			{children}
		</Link>
	) : (
		<a
			{...props}
			href={url ?? undefined}
			ref={ref as Ref<HTMLAnchorElement>}
			target={newTab ? "_blank" : undefined}
			download={download}
			onClick={onClick}
		>
			{children}
		</a>
	)
}
