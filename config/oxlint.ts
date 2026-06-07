import { defineConfig } from "oxlint"

export default defineConfig({
	ignorePatterns: ["library/**"],
	options: { typeAware: true, typeCheck: true },
})
