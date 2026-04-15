import { stegaClean } from "next-sanity"
import { linkIsInternal } from "../functions"

export type CMSLink = {
	_type: "link"
	text?: string
	type?: string
	/** Resolved by inline GROQ projection; null when not an internal link. */
	internalSlug?: string | null
	url?: string
	email?: string
	phone?: string
	value?: string
	blank?: boolean
	parameters?: string
	anchor?: string
}

/** All values accepted by resolveRoute / isRouteDefined. */
export type LinkHref = string | null | undefined | CMSLink

export const resolveRoute = (
	link: LinkHref,
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

	if (link.type === "phone" && link.phone) {
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
 * Returns true if the link resolves to an actual destination URL.
 *
 * Prefer this over `!!link` — the link field stores a partial object
 * (e.g. `{ _type: "link", type: "internal" }`) via initialValue even when no
 * destination has been selected by the editor, so a plain truthiness check will
 * always be true regardless of whether the link goes anywhere.
 */
export const isRouteDefined = (
	link: LinkHref,
): link is Exclude<LinkHref, null | undefined> => !!resolveRoute(link).url
