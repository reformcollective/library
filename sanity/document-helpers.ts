import { siteURL } from "library/siteURL"
import { map } from "rxjs"
import { documentPaths } from "sanity/lib/slug-resolver"
import type {
	DocumentLocationResolver,
	DocumentLocationsState,
} from "sanity/presentation"

type SanityDocument = {
	_type?: string
}

const resolveDocumentRoute = (document: unknown) => {
	const sanityDocument = document as SanityDocument | null | undefined
	if (!sanityDocument?._type) return undefined

	const resolver =
		documentPaths[sanityDocument._type as keyof typeof documentPaths]
	if (!resolver) return undefined

	return resolver(sanityDocument as never)
}

/**
 * Resolves a fetched Sanity document to its canonical public pathname
 */
export const resolveDocumentPathname = (document: unknown) => {
	return resolveDocumentRoute(document)?.path || null
}

/**
 * Resolves a fetched Sanity document to its canonical public title
 */
export const resolveDocumentTitle = (document: unknown) => {
	return resolveDocumentRoute(document)?.title || null
}

/**
 * Resolves a fetched Sanity document to its absolute production URL
 */
export const resolveProductionUrl = (document: unknown) => {
	const path = resolveDocumentPathname(document)
	if (!path) return undefined

	return `${siteURL}${path}`
}

/**
 * Returns the schema types that have document path declarations.
 */
export const getLinkableTypes = () => {
	return Object.keys(documentPaths)
}

/**
 * Adapts document path declarations to Sanity Presentation's locations API
 */
export const resolveDocumentLocations: DocumentLocationResolver = (
	{ id },
	context,
) => {
	const doc$ = context.documentStore.listenQuery(
		`*[_id==$id][0]`,
		{ id },
		{ perspective: "previewDrafts" },
	)

	return doc$.pipe(
		map((document: SanityDocument | null) => {
			if (!document) return { locations: [] }
			const href = resolveDocumentPathname(document)
			if (!href) return { locations: [] }

			return {
				locations: [
					{ href, title: resolveDocumentTitle(document) || "No Title" },
				],
			} satisfies DocumentLocationsState
		}),
	)
}
