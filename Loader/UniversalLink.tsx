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
	href: Route | string | null | undefined | { href: `https://${string}` }
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

/**
 * a link that navigates when clicked, using the specified transition
 * @returns
 */
export default function UniversalLink({
	children,
	transition = libraryConfig.defaultTransition,
	openInNewTab,
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

	const href =
		props.href && typeof props.href === "object"
			? "href" in props.href
				? props.href.href
				: route(props.href)
			: props.href
	const internal = href ? linkIsInternal(href) : false
	const router = useRouter()

	const handleClick: React.MouseEventHandler = (e) => {
		e.preventDefault()
		if (!href) return

		if (openInNewTab || !internal) {
			window.open(href, "_blank")
		} else {
			router.prefetch(href)
			loadPage({
				to: href,
				transition,
				routerNavigate: router.push as (url: string) => unknown,
			})
		}
	}

	return internal && href ? (
		<Link
			onClick={handleClick}
			{...props}
			// biome-ignore lint/suspicious/noExplicitAny: I am very intentionally disabling type checking here because a cast would not be backwards compatible
			href={href as any}
		>
			{children}
		</Link>
	) : (
		<a onClick={handleClick} {...props} href={href ?? undefined}>
			{children}
		</a>
	)
}
