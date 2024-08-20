declare module "gatsby" {
	export function useStaticQuery<TData = unknown>(
		query: StaticQueryDocument,
	): TData

	export * from "gatsby/index.d.ts"
}
