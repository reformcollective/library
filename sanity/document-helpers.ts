import { siteURL } from "library/siteURL"
import { documentPaths } from "sanity/lib/slug-resolver"
import type {
	DocumentLocationResolver,
	DocumentLocationsState,
} from "sanity/presentation"

type SanityDocument = {
	_type?: string
}
type ObserverLike<T> =
	| ((value: T) => void)
	| {
			next?: (value: T) => void
			error?: (error: unknown) => void
			complete?: () => void
	  }

const documentToLocations = (
	document: SanityDocument | null,
): DocumentLocationsState => {
	if (!document) return { locations: [] }
	const href = resolveDocumentPathname(document)
	if (!href) return { locations: [] }

	return {
		locations: [{ href, title: resolveDocumentTitle(document) || "No Title" }],
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

	return {
		subscribe(
			observer: ObserverLike<DocumentLocationsState> | null | undefined,
		) {
			const target =
				typeof observer === "function" ? { next: observer } : observer
			const subscription = doc$.subscribe({
				next: (document: SanityDocument | null) => {
					target?.next?.(documentToLocations(document))
				},
				error: (error) => target?.error?.(error),
				complete: () => target?.complete?.(),
			})

			return subscription
		},
	} as ReturnType<DocumentLocationResolver>
}
