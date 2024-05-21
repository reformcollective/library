import type { UniversalLinkProps } from "library/Loader/UniversalLink"
import UniversalLink from "library/Loader/UniversalLink"
import links from "utils/links"

import { ModalContext } from "../Providers/Modal"
import { useContext } from "react"

/**
 * An extension of UniversalLink that detects contact/demo links and
 * wraps them with the relevant ContactModal
 */
export function ContactLink({ ...props }: UniversalLinkProps) {
	const { to, transition, forwardRef, ...filteredProps } = props
	const { setType } = useContext(ModalContext)

	return to === links.contact || to === links.getStarted ? (
		<UniversalLink
			type="button"
			{...filteredProps}
			onClick={() => {
				setType(to)
			}}
		/>
	) : (
		<UniversalLink {...props} />
	)
}
