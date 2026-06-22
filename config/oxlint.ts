import { defineConfig } from "oxlint"

export default defineConfig({
	jsPlugins: ["./library/config/capsize.ts"],
	options: { typeAware: true, typeCheck: true },
	rules: {
		"capsize/no-layout-text-style": "warn",
	},
})
