declare module "gatsby" {
	import type { StaticQueryDocument } from "gatsby/index.d.ts"

	export function useStaticQuery<TData = unknown>(
		query: StaticQueryDocument,
	): TData

	export * from "gatsby/index.d.ts"
}
