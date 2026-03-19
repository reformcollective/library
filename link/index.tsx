"use client"

import Link, { type LinkProps } from "next/link"
import { stegaClean } from "next-sanity"
import type { ComponentProps, Ref } from "react"
import { linkIsInternal } from "../functions"
import { useTransitioner } from "./transitioner"

type CMSLink = {
	_type: "link"
	text?: string
	type?: string
	internalSlug?: string
	url?: string
	email?: string
	phone?: string
	value?: string
	blank?: boolean
	parameters?: string
	anchor?: string
}

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
	href: string | null | undefined | CMSLink
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

	type?: undefined
} & Omit<ComponentProps<"a">, "href" | "onClick" | "ref">

export type UniversalLinkProps = (ButtonProps | AnchorProps) & {
	ref?:
		| Ref<HTMLButtonElement | null>
		| Ref<HTMLAnchorElement | null>
		| Ref<HTMLButtonElement | HTMLAnchorElement | null>
}

export const resolveRoute = (
	link: AnchorProps["href"],
): { url: string | undefined; newTab: boolean } => {
	if (typeof link === "string")
		return {
			url: link,
			newTab: !linkIsInternal(link),
		}
	if (!link)
		return {
			url: undefined,
			newTab: false,
		}

	if (link.type === "internal" && link.internalSlug) {
		const slugToUse = link.internalSlug === "home" ? "" : link.internalSlug
		return {
			url: `/${stegaClean(slugToUse || "")}${stegaClean(link.parameters || "")}${stegaClean(link.anchor || "")}`,
			// default to same tab if not specified
			newTab: link.blank ?? false,
		}
	}

	if (link.type === "external" && link.url)
		return {
			url: `${stegaClean(link.url || "")}${stegaClean(link.parameters || "")}${stegaClean(link.anchor || "")}`,
			// default to other tab if not specified
			newTab: link.blank ?? true,
		}

	if (link.type === "email" && link.email) {
		return { url: `mailto:${stegaClean(link.email || "")}`, newTab: true }
	}

	if (link.type === "phone") {
		return {
			url: `tel:${stegaClean(link.phone || "")}`,
			newTab: true,
		}
	}

	return {
		url: undefined,
		newTab: false,
	}
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
	...props
}: UniversalLinkProps) {
	const transitioner = useTransitioner()

	if (props.type) {
		return (
			<button
				{...props}
				ref={ref as Ref<HTMLButtonElement>}
				style={{
					cursor: "pointer",
					...props.style,
				}}
			>
				{children}
			</button>
		)
	}

	const { url, newTab } = resolveRoute(props.href)
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
			onClick={onClick}
		>
			{children}
		</a>
	)
}
