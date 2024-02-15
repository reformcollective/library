import { Link } from "gatsby"
import libraryConfig from "libraryConfig"
import type { MouseEventHandler } from "react"

import type { Transitions } from "."
import { loadPage } from "./TransitionUtils"

export type UniversalLinkRef = HTMLButtonElement &
	(HTMLAnchorElement & Link<unknown>)

interface BaseLinkProps {
	/**
	 * should the link open in a new tab?
	 */
	openInNewTab?: boolean
	children: React.ReactNode
	className?: string
	onMouseEnter?: MouseEventHandler
	onMouseLeave?: MouseEventHandler
	ariaLabel?: string
	anchor?: string
}

type ButtonProps = BaseLinkProps & {
	/**
	 * what should happen when the button is clicked?
	 */
	onClick?: MouseEventHandler
	/**
	 * what type of button is this?
	 */
	type: "submit" | "button" | "reset"
	/**
	 * forward a ref to the button
	 */
	forwardRef?: React.RefObject<HTMLButtonElement>
	/**
	 * Do you want to scroll to a specific location after the transition?
	 */
	anchor?: string

	href?: undefined
	to?: undefined
	transition?: undefined
}

type AnchorProps = BaseLinkProps &
	(
		| {
				/**
				 * where should the link navigate to?
				 */
				to: string
				href?: undefined
		  }
		| {
				/**
				 * where should the link navigate to?
				 */
				href: string
				to?: undefined
		  }
	) & {
		/**
		 * which transition should be used when navigating to this link?
		 */
		transition?: Transitions
		/**
		 * forward a ref to the link or anchor tag
		 */
		forwardRef?: React.RefObject<HTMLAnchorElement & Link<unknown>>

		onClick?: undefined
		type?: undefined
	}

export type UniversalLinkProps = ButtonProps | AnchorProps

/**
 * a link that navigates when clicked, using the specified transition
 * @returns
 */
export default function UniversalLink({
	href,
	to,
	transition = libraryConfig.defaultTransition,
	openInNewTab = false,
	forwardRef,
	type,
	children,
	ariaLabel,
	...props
}: UniversalLinkProps) {
	if (type) {
		return (
			<button
				type={type}
				ref={forwardRef}
				aria-label={ariaLabel}
				{...props}
				style={{
					cursor: "pointer",
				}}
			>
				{children}
			</button>
		)
	}

	const internal = /^\/(?!\/)/.test(href ?? to)

	const handleClick: React.MouseEventHandler = (e) => {
		e.preventDefault()

		if (openInNewTab || !internal) {
			window.open(to, "_blank")
		} else {
			loadPage(href ?? to, transition).catch((error: string) => {
				throw new Error(error)
			})
		}
	}

	return internal ? (
		<Link
			to={href ?? to}
			onClick={handleClick}
			ref={forwardRef}
			aria-label={ariaLabel}
			{...props}
		>
			{children}
		</Link>
	) : (
		<a href={to} ref={forwardRef} aria-label={ariaLabel} {...props}>
			{children}
		</a>
	)
}
