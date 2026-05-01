import { siteURL } from "library/siteURL"
import { map } from "rxjs"
import { documentPaths } from "sanity/lib/slug-resolver"
import type { DocumentLocationResolver } from "sanity/presentation"

type SanityDocument = {
	_type?: string
}

type DocumentLocation = {
	href: string
	title: string
}

const normalizeLocation = (
	route:
		| { path: string | null | undefined; title: string | null | undefined }
		| null
		| undefined,
): DocumentLocation | undefined => {
	if (!route?.path || !route.title) return undefined

	return {
		href: route.path,
		title: route.title,
	}
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
	return normalizeLocation(resolveDocumentRoute(document))?.href
}

/**
 * Resolves a fetched Sanity document to its canonical public title
 */
export const resolveDocumentTitle = (document: unknown) => {
	return normalizeLocation(resolveDocumentRoute(document))?.title
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
 * Resolves a fetched Sanity document to the Presentation location shape
 */
export const resolveDocumentLocation = (document: unknown) => {
	return normalizeLocation(resolveDocumentRoute(document))
}

/**
 * Adapts document path declarations to Sanity Presentation's locations API
 */
export const documentLocationsResolver: DocumentLocationResolver = (
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

			const location = resolveDocumentLocation(document)
			if (!location) return { locations: [] }

			return {
				locations: [location],
			}
		}),
	)
}
