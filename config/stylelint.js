import postcssSyntax from "postcss-styled-syntax"

const yearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
	.toISOString()
	.split("T")[0]

export default {
	extends: "stylelint-config-standard",
	customSyntax: postcssSyntax,
	overrides: [{ files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"] }],
	plugins: ["stylelint-plugin-use-baseline"],
	rules: {
		"no-empty-source": null,
		"block-no-empty": null,
		"media-query-no-invalid": null,
		"custom-property-empty-line-before": null,
		"nesting-selector-no-missing-scoping-root": null,
		"layer-name-pattern": null,
		"at-rule-prelude-no-invalid": null,
		"plugin/use-baseline": [
			true,
			{
				available: yearAgo,
				ignoreSelectors: ["/^view-transition-/"],
				ignoreProperties: {
					"background-clip": ["text"],
					"view-transition-name": [],
					"text-wrap": ["pretty"],
					"user-select": ["none"],
					"overscroll-behavior": ["contain"],
				},
			},
		],
	},
}
