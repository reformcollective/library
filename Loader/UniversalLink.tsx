import { Link } from "gatsby"
import { linkIsInternal } from "library/functions"
import libraryConfig from "libraryConfig"
import type { ComponentProps, LegacyRef } from "react"
import type { Transitions } from "."
import { loadPage } from "./TransitionUtils"

/**
 * utility for referencing a universal link if you don't know the type
 */
export type UniversalLinkRef = HTMLButtonElement &
	(HTMLAnchorElement & Link<unknown>)

/**
 * get the base props of a button, remapping the prop ref => forwardRef
 */
type GetProps<T extends React.ElementType> = Omit<ComponentProps<T>, "ref">

/**
 * props for a button element
 */
type StandardButtonProps = GetProps<"button"> & {
	/** type is required, else we don't know its a button! */
	type: "button" | "submit" | "reset"
	forwardRef?: LegacyRef<HTMLButtonElement>
}

type StandardAnchorProps = Omit<GetProps<"a">, "href" | "onClick"> & {
	/** type here is important for discriminating the union */
	type?: undefined
	/** where the link goes */
	to: string
	/** the transition to use when navigating */
	transition?: Transitions
	/**  should this open in a new tab? */
	openInNewTab?: boolean
	forwardRef?: React.RefObject<HTMLAnchorElement & Link<unknown>>
}

export type UniversalLinkProps = StandardAnchorProps | StandardButtonProps

/**
 * a link that navigates when clicked, using the specified transition
 * @returns
 */
export default function UniversalLink(props: UniversalLinkProps) {
	if (props.type) {
		return (
			<button
				ref={props.forwardRef}
				{...props}
				style={{
					cursor: "pointer",
					...props.style,
				}}
			/>
		)
	}

	const {
		to,
		transition = libraryConfig.defaultTransition,
		openInNewTab,
		children,
		forwardRef,
	} = props

	const internal = linkIsInternal(to)
	const handleClick: React.MouseEventHandler = (e) => {
		e.preventDefault()
		if (openInNewTab || !internal) {
			window.open(to, "_blank")
		} else {
			loadPage(to, transition).catch((error: string) => {
				throw new Error(error)
			})
		}
	}

	return internal ? (
		<Link onClick={handleClick} ref={forwardRef} {...props}>
			{children}
		</Link>
	) : (
		<a href={to} onClick={handleClick} ref={forwardRef} {...props}>
			{children}
		</a>
	)
}
