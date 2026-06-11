import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
	resolve: {
		// source files import siblings via the bare "library/*" alias; mirror it so
		// the standalone test runner can resolve them the way a consuming project does
		alias: [
			{
				find: /^library\//,
				replacement: fileURLToPath(new URL("./", import.meta.url)),
			},
		],
	},
	test: {
		typecheck: {
			enabled: true,
			ignoreSourceErrors: true,
		},
	},
})
