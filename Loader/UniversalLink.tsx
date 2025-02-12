"use client"

import libraryConfig from "libraryConfig"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Route } from "nextjs-routes"
import { route } from "nextjs-routes"
import type { ComponentProps } from "react"
import type { Transitions } from "."
import { linkIsInternal } from "../functions"
import { loadPage } from "./TransitionUtils"

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
} & Omit<ComponentProps<"button">, "type">

type AnchorProps = {
	/**
	 * where should the link navigate to?
	 */
	href:
		| Route
		| string
		| null
		| undefined
		| { href: `https://${string}` }
		| CMSLink
	/**
	 * which transition should be used when navigating to this link?
	 */
	transition?: Transitions
	/**
	 * open this link in a new tab?
	 */
	openInNewTab?: boolean

	type?: undefined
} & Omit<ComponentProps<"a">, "href" | "onClick">

export type UniversalLinkProps = ButtonProps | AnchorProps

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

	if ("href" in link)
		return {
			url: link.href,
			newTab: !linkIsInternal(link.href),
		}
	if ("pathname" in link)
		return {
			url: route(link),
			newTab: !linkIsInternal(link.pathname),
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
	transition = libraryConfig.defaultTransition,
	...props
}: UniversalLinkProps) {
	if (props.type) {
		return (
			<button
				{...props}
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
	const router = useRouter()

	const handleClick: React.MouseEventHandler = (e) => {
		e.preventDefault()
		if (!url) return

		if (internal && !newTab) {
			router.prefetch(url)
			loadPage({
				to: url,
				transition,
				routerNavigate: router.push as (url: string) => unknown,
			})
		}

		window.open(url, newTab ? "_blank" : "_self")
	}

	return internal && url ? (
		<Link
			onClick={handleClick}
			{...props}
			// biome-ignore lint/suspicious/noExplicitAny: I am very intentionally disabling type checking here because a cast would not be backwards compatible
			href={url as any}
		>
			{children}
		</Link>
	) : (
		<a
			onClick={handleClick}
			{...props}
			href={url ?? undefined}
			rel="noopener noreferrer"
		>
			{children}
		</a>
	)
}
