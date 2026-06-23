import type { DocumentPathResolver } from "library/sanity/define-document-paths"
import type { DocumentLocationResolver, DocumentLocationsState } from "sanity/presentation"

import { siteURL } from "library/siteURL"
import { map } from "rxjs"
import { documentPaths } from "sanity/lib/slug-resolver"

export type SanityDocument = {
	_type?: string
	[key: string]: unknown
}

type DocumentRoute = {
	path: string
	title: string | null
}

export type DocumentUrlResolverContext = {
	document: SanityDocument
	path: string
	title: string | null
}

export type DocumentHelpersOptions = {
	documentPaths?: DocumentPathResolver
	documentQuery?: string
	resolveLocationHref?: (context: DocumentUrlResolverContext) => string | null | undefined
	resolveProductionUrl?: (context: DocumentUrlResolverContext) => string | null | undefined
}

function resolveRoute(documentPathsOption: DocumentPathResolver, document: unknown) {
	const sanityDocument = document as SanityDocument | null | undefined
	if (!sanityDocument?._type) return null

	const resolver = documentPathsOption[sanityDocument._type as keyof typeof documentPathsOption]
	if (!resolver) return null

	const route = resolver(sanityDocument as never)
	const path = route?.path || null
	if (!path) return null

	return {
		document: sanityDocument,
		path,
		title: route?.title || null,
	}
}

export function createDocumentHelpers({
	documentPaths: documentPathsOption = documentPaths,
	documentQuery = `*[_id==$id][0]`,
	resolveLocationHref,
	resolveProductionUrl: resolveProductionUrlOption,
}: DocumentHelpersOptions = {}) {
	function resolveDocumentRoute(
		document: unknown,
	): (DocumentRoute & { document: SanityDocument }) | null {
		return resolveRoute(documentPathsOption, document)
	}

	/**
	 * Resolves a fetched Sanity document to its canonical public pathname
	 */
	function resolveDocumentPathname(document: unknown) {
		return resolveDocumentRoute(document)?.path || null
	}

	/**
	 * Resolves a fetched Sanity document to its canonical public title
	 */
	function resolveDocumentTitle(document: unknown) {
		return resolveDocumentRoute(document)?.title || null
	}

	/**
	 * Resolves a fetched Sanity document to its absolute production URL
	 */
	function resolveProductionUrl(document: unknown) {
		const route = resolveDocumentRoute(document)
		if (!route) return undefined

		return (
			resolveProductionUrlOption?.({
				document: route.document,
				path: route.path,
				title: route.title,
			}) ?? `${siteURL}${route.path}`
		)
	}

	/**
	 * Returns the schema types that have document path declarations.
	 */
	function getLinkableTypes() {
		return Object.keys(documentPathsOption)
	}

	/**
	 * Adapts document path declarations to Sanity Presentation's locations API
	 */
	const resolveDocumentLocations: DocumentLocationResolver = ({ id }, context) => {
		const doc$ = context.documentStore.listenQuery(
			documentQuery,
			{ id },
			{ perspective: "previewDrafts" },
		)

		return doc$.pipe(
			map((document: SanityDocument | null) => {
				const route = resolveDocumentRoute(document)
				if (!route) return { locations: [] }

				const href =
					resolveLocationHref?.({
						document: route.document,
						path: route.path,
						title: route.title,
					}) ?? route.path
				if (!href) return { locations: [] }

				return {
					locations: [{ href, title: route.title || "No Title" }],
				} satisfies DocumentLocationsState
			}),
		)
	}

	return {
		getLinkableTypes,
		resolveDocumentLocations,
		resolveDocumentPathname,
		resolveDocumentTitle,
		resolveProductionUrl,
	}
}

const defaultDocumentHelpers = createDocumentHelpers()

export const getLinkableTypes = defaultDocumentHelpers.getLinkableTypes

export const resolveDocumentLocations = defaultDocumentHelpers.resolveDocumentLocations

export const resolveDocumentPathname = defaultDocumentHelpers.resolveDocumentPathname

export const resolveDocumentTitle = defaultDocumentHelpers.resolveDocumentTitle

export const resolveProductionUrl = defaultDocumentHelpers.resolveProductionUrl
