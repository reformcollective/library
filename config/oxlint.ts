import { fileURLToPath } from "node:url"
import { defineConfig } from "oxlint"

type OxlintConfigOptions = {
	typeChecking?: boolean
}

export function createOxlintConfig({ typeChecking = true }: OxlintConfigOptions = {}) {
	return defineConfig({
		jsPlugins: [fileURLToPath(new URL("./capsize.ts", import.meta.url))],
		...(typeChecking ? { options: { typeAware: true, typeCheck: true } } : {}),
		rules: {
			"capsize/no-layout-text-style": "warn",
		},
	})
}

export default createOxlintConfig()
