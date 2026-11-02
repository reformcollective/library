import { defineConfig } from "oxlint"

export default defineConfig({
	jsPlugins: ["./library/config/capsize.ts", "./library/config/reform.ts"],
	options: { typeAware: true, typeCheck: true },
	rules: {
		"capsize/no-layout-text-style": "warn",
		"reform/no-inline-style": "error",
		"reform/css-needs-helper": "error",
		"reform/no-raw-img": "error",
	},
})
