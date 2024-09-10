import MiniSearch from "minisearch"
import { useEffect, useMemo } from "react"
import { useDeepCompareMemo } from "use-deep-compare"

export const useSearchResults = <T extends { id: string }>(
	query: string,
	items: T[],
	indexableFields: (keyof T)[],
) => {
	/**
	 * create our search indexes
	 */
	const fuzzyMatcher = useDeepCompareMemo(() => {
		return new MiniSearch<T>({
			fields: indexableFields.map(String),
			searchOptions: {
				prefix: true,
				fuzzy: 0.2,
			},
			extractField: (document, fieldName) => {
				const value = document[fieldName as keyof T]

				if (typeof value === "string") {
					return value
				}

				if (typeof value === "number") {
					return value.toString()
				}

				return JSON.stringify(value)
			},
		})
	}, [indexableFields])

	/**
	 * add each item to the search index
	 */
	useEffect(() => {
		fuzzyMatcher.addAll(items.filter((item) => !fuzzyMatcher.has(item.id)))
	}, [fuzzyMatcher, items])

	/**
	 * search for items based on the search term
	 */
	const results = useMemo(
		() => fuzzyMatcher.search(query),
		[fuzzyMatcher, query],
	)
		.map((result) => items.find((item) => item.id === result.id))
		.filter(Boolean)

	return query ? results : items
}
