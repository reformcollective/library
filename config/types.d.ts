declare module "postcss-styled-syntax" {
	const syntax: unknown
	export default syntax
}

declare module "ultracite/stylelint" {
	const config: {
		overrides?: unknown[]
		plugins?: string[]
		rules?: Record<string, unknown>
	}
	export default config
}
