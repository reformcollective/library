import viteTsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [viteTsconfigPaths({ projects: ["../tsconfig.json"] })],
	test: {
		typecheck: {
			enabled: true,
			ignoreSourceErrors: true,
		},
	},
})
