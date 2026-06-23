import { fileURLToPath } from "node:url"

import { defineConfig } from "oxlint"
import core from "ultracite/oxlint/core"
import next from "ultracite/oxlint/next"
import react from "ultracite/oxlint/react"
import vitest from "ultracite/oxlint/vitest"

type OxlintConfigOptions = {
	typeChecking?: boolean
}

export function createOxlintConfig({
	typeChecking = true,
}: OxlintConfigOptions = {}) {
	return defineConfig({
		extends: [core, next, react, vitest],
		ignorePatterns: core.ignorePatterns,
		jsPlugins: [fileURLToPath(new URL("./capsize.ts", import.meta.url))],
		...(typeChecking ? { options: { typeAware: true, typeCheck: true } } : {}),
		rules: {
			"capsize/no-layout-text-style": "warn",
		},
	})
}

export default createOxlintConfig()
