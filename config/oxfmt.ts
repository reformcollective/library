import { defineConfig } from "oxfmt"

export default defineConfig({
	semi: false,
	// Oxfmt resolves ignorePatterns from the root config file location.
	// Root apps should re-export this helper from their own root config.
	ignorePatterns: ["pnpm-lock.yaml", "library/**"],
	useTabs: true,
	sortImports: {
		groups: [
			"type-import",
			["value-builtin", "value-external"],
			"type-internal",
			"value-internal",
			["type-parent", "type-sibling", "type-index"],
			["value-parent", "value-sibling", "value-index"],
			"unknown",
		],
	},
})
