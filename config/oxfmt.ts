import { defineConfig } from "oxfmt"

export function createOxfmtConfig() {
	return defineConfig({
		semi: false,
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
}

export default createOxfmtConfig()
