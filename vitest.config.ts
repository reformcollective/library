import viteTsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
	// consuming projects set jsx: "preserve" in tsconfig for Next.js, but
	// vitest's oxc transform needs to transform JSX itself when running tests
	oxc: {
		jsx: {
			runtime: "automatic",
		},
	},
	plugins: [viteTsconfigPaths({ projects: ["../tsconfig.json"] })],
	test: {
		typecheck: {
			enabled: true,
			ignoreSourceErrors: true,
		},
	},
})
