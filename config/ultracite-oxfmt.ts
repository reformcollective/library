import { defineConfig } from "oxfmt"
import ultracite from "ultracite/oxfmt"

export function createOxfmtConfig() {
	return defineConfig({
		...ultracite,
		semi: false,
		useTabs: true,
		trailingComma: "all",
	})
}

export default createOxfmtConfig()
