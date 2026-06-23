import postcssSyntax from "postcss-styled-syntax"

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
				available: 2024,
				ignoreSelectors: ["/^view-transition-/"],
				ignoreProperties: {
					"background-clip": ["text"],
					"view-transition-name": [],
					"text-wrap": ["pretty"],
					"user-select": ["none"],
				},
			},
		],
	},
}
