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
		"custom-property-empty-line-before": null,
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
		/**
		 * in the particularly likely event that one of these rules triggers when it should not
		 * disable the rule here and paste an example of failing css
		 */
		/*
    @media (min-width: ${Number.parseInt(size, 10) /
						(2 * scaleFactor)}px) {
						background-image: url(${url});
					}
				 */
		"media-query-no-invalid": null,
		/*
		@layer ${foundation} { ... }

	 */
		"at-rule-prelude-no-invalid": null,
		"layer-name-pattern": null,
		// "no-empty-source": null,
		// "block-no-empty": null,
		// "nesting-selector-no-missing-scoping-root": null,
	},
}
