import MiniSearch from "minisearch"
import { useEffect } from "react"
import { useDeepCompareMemo } from "use-deep-compare"

type IdLike = string | number

export function useSearchResults<
	T extends Record<string, unknown>,
	K extends keyof T = "_id" extends keyof T ? "_id" : "id",
>(
	query: string,
	items: T[],
	indexableFields: (keyof T)[],
	idField?: K, // defaults to "_id" if present, else "id"
) {
	const resolvedIdField = (idField ??
		("_id" in (items[0] ?? {}) ? ("_id" as K) : ("id" as K))) as K

	const fuzzyMatcher = useDeepCompareMemo(() => {
		return new MiniSearch<T>({
			idField: String(resolvedIdField),
			fields: indexableFields.map(String),
			searchOptions: { prefix: true, fuzzy: 0.2 },
			extractField: (document, fieldName) => {
				const value = document[fieldName as keyof T]
				if (typeof value === "string") return value
				if (typeof value === "number") return String(value)
				return JSON.stringify(value)
			},
		})
	}, [indexableFields, resolvedIdField])

	useEffect(() => {
		fuzzyMatcher.addAll(
			items.filter((item) => {
				const id = item[resolvedIdField] as IdLike | undefined
				return id != null && !fuzzyMatcher.has(String(id))
			}),
		)
	}, [fuzzyMatcher, items, resolvedIdField])

	if (!query) return items
	const found = fuzzyMatcher.search(query)

	return found
		.map((res) =>
			items.find(
				(it) =>
					String(it[resolvedIdField] as IdLike | undefined) === String(res.id),
			),
		)
		.filter(Boolean) as T[]
}
