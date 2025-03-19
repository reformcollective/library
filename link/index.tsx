"use client"

import type { ComponentProps, Ref } from "react"
import { linkIsInternal } from "../functions"
import { useTransitioner } from "./transitioner"
import type { Transitions } from "./loader"
import libraryConfig from "libraryConfig"
import Link from "next/link"

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
	transition?: Transitions

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

	if (link.type === "internal" && link.internalSlug)
		return {
			url: `/${link.internalSlug.trim()}${link.parameters?.trim() || ""}${link.anchor?.trim() || ""}`,
			// default to same tab if not specified
			newTab: link.blank ?? false,
		}

	if (link.type === "external" && link.url)
		return {
			url: `${link.url.trim()}${link.parameters?.trim() || ""}${link.anchor?.trim() || ""}`,
			// default to other tab if not specified
			newTab: link.blank ?? true,
		}

	if (link.type === "email" && link.email) {
		return { url: `mailto:${link.email.trim()}`, newTab: true }
	}

	if (link.type === "phone") {
		return {
			url: `tel:${link.phone?.replace(/\s+/g, "").trim()}`,
			newTab: true,
		}
	}

	return {
		url: undefined,
		newTab: false,
	}
}

/**
 * a link that navigates when clicked, using the specified transition
 * @returns
 */
export default function UniversalLink({
	children,
	ref,
	transition = libraryConfig.defaultViewTransition,
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
				}}
			>
				{children}
			</button>
		)
	}

	const { url, newTab } = resolveRoute(props.href)
	const internal = url ? linkIsInternal(url) : false

	const onClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
		if (!url) return

		e.preventDefault()
		if (internal && !newTab) {
			transitioner(url, transition)
		} else {
			window.open(url, newTab ? "_blank" : "_self")
		}
	}

	return internal && url ? (
		<Link
			{...props}
			// biome-ignore lint/suspicious/noExplicitAny: I am very intentionally disabling type checking here because a cast would not be backwards compatible
			href={url as any}
			ref={ref as Ref<HTMLAnchorElement>}
			target={newTab ? "_blank" : undefined}
			onClick={onClick}
			suppressHydrationWarning
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
