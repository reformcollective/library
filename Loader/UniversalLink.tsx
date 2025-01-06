"use client";

import libraryConfig from "libraryConfig";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties, MouseEventHandler } from "react";
import type { Transitions } from ".";
import { linkIsInternal } from "../functions";
import { loadPage } from "./TransitionUtils";

interface BaseLinkProps {
	/**
	 * should the link open in a new tab?
	 */
	openInNewTab?: boolean;
	children: React.ReactNode;
	className?: string;
	onMouseEnter?: MouseEventHandler;
	onMouseLeave?: MouseEventHandler;
	ariaLabel?: string;
	anchor?: string;
	"aria-disabled"?: boolean;
	style?: CSSProperties;
}

interface ButtonProps extends BaseLinkProps {
	/**
	 * what should happen when the button is clicked?
	 */
	onClick?: MouseEventHandler;
	/**
	 * what type of button is this?
	 */
	type: "submit" | "button" | "reset";
	/**
	 * forward a ref to the button
	 */
	ref?: React.RefObject<HTMLButtonElement | null>;
	/**
	 * Do you want to scroll to a specific location after the transition?
	 */
	anchor?: string;

	href?: undefined;
	transition?: undefined;
}

interface AnchorProps extends BaseLinkProps {
	/**
	 * where should the link navigate to?
	 */
	href: string | null | undefined
	/**
	 * which transition should be used when navigating to this link?
	 */
	transition?: Transitions;
	/**
	 * forward a ref to the link or anchor tag
	 */
	ref?: React.RefObject<HTMLAnchorElement | null>;

	onClick?: undefined;
	type?: undefined;
}

export type UniversalLinkProps = ButtonProps | AnchorProps;

/**
 * a link that navigates when clicked, using the specified transition
 * @returns
 */
export default function UniversalLink({
	href,
	transition = libraryConfig.defaultTransition,
	openInNewTab = false,
	ref,
	type,
	children,
	ariaLabel,
	...props
}: UniversalLinkProps) {
	if (type) {
		return (
			<button
				type={type}
				ref={ref}
				aria-label={ariaLabel}
				{...props}
				style={{
					cursor: "pointer",
				}}
			>
				{children}
			</button>
		);
	}

	const internal = href ? linkIsInternal(href) : false
	const router = useRouter()

	const handleClick: React.MouseEventHandler = (e) => {
		e.preventDefault()
		if (!href) return

		if (openInNewTab || !internal) {
			window.open(href, "_blank");
		} else {
			loadPage({ to: href, transition, routerNavigate: router.push });
		}
	};

	return internal && href ? (
		<Link
			href={href}
			onClick={handleClick}
			ref={ref}
			aria-label={ariaLabel}
			{...props}
		>
			{children}
		</Link>
	) : (
		<a
			href={href ?? undefined}
			onClick={handleClick}
			ref={ref}
			aria-label={ariaLabel}
			{...props}
		>
			{children}
		</a>
	);
}
