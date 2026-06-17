import postcssSyntax from "postcss-styled-syntax"
import ultracite from "ultracite/stylelint"

export default {
	...ultracite,
	customSyntax: postcssSyntax,
	overrides: [
		...(ultracite.overrides ?? []),
		{ files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"] },
	],
	plugins: [...(ultracite.plugins ?? []), "stylelint-plugin-use-baseline"],
	rules: {
		...ultracite.rules,
		"no-empty-source": null,
		"order/properties-order": null,
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
