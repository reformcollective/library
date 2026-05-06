import type { AllSanitySchemaTypes } from "sanity.types"

type Schemas = Extract<AllSanitySchemaTypes, { _type: string }>

export type DocumentPath = {
	path: string | null | undefined
	title: string | null | undefined
}

export type DocumentPathResult = null | undefined | DocumentPath

export type DocumentPathResolver<U extends { _type: string } = Schemas> = {
	[K in U["_type"]]?: (document: Extract<U, { _type: K }>) => DocumentPathResult
}

/**
 * Typing helper for project-owned document path declarations.
 */
export const defineDocumentPaths = <U extends { _type: string } = Schemas>(
	resolver: DocumentPathResolver<U>,
) => resolver
