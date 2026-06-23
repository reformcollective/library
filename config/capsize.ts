const DISPLAY_LAYOUT_RE = /display\s*:\s*["']?(?:inline-)?(?:flex|grid)\b/
const TEXT_STYLE_MEMBER_RE = /\btextStyles\.[A-Za-z_$][\w$]*/

type AstNode = {
	type: string
	start: number
	end: number
	[key: string]: unknown
}

function isNode(value: unknown): value is AstNode {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string" &&
		typeof (value as { start?: unknown }).start === "number" &&
		typeof (value as { end?: unknown }).end === "number"
	)
}

function forEachChild(node: AstNode, callback: (child: AstNode) => void) {
	for (const [key, value] of Object.entries(node)) {
		if (key === "parent") continue

		if (isNode(value)) {
			callback(value)
			continue
		}

		if (!Array.isArray(value)) continue

		for (const item of value) {
			if (isNode(item)) callback(item)
		}
	}
}

function isStyledCall(node: AstNode, styledNames: Set<string>) {
	if (node.type !== "CallExpression") return false

	const callee = node.callee
	return (
		isNode(callee) &&
		callee.type === "Identifier" &&
		styledNames.has(callee.name as string)
	)
}

function containsTextStyleReference(
	source: string,
	textStyleAliases: Set<string>,
) {
	if (TEXT_STYLE_MEMBER_RE.test(source)) return true

	for (const alias of textStyleAliases) {
		if (new RegExp(`\\b${alias}\\b`).test(source)) return true
	}

	return false
}

function sameLevelTextStyleAndLayout(
	source: string,
	textStyleAliases: Set<string>,
) {
	let depth = 0
	const depthsWithTextStyle = new Set<number>()
	const depthsWithLayout = new Set<number>()

	for (let index = 0; index < source.length; index += 1) {
		const char = source[index]

		if (char === "$" && source[index + 1] === "{") {
			let interpolationDepth = 1
			const interpolationStart = index
			index += 2

			while (index < source.length && interpolationDepth > 0) {
				const interpolationChar = source[index]
				if (interpolationChar === "{") interpolationDepth += 1
				if (interpolationChar === "}") interpolationDepth -= 1
				index += 1
			}

			const interpolation = source.slice(interpolationStart, index)
			if (containsTextStyleReference(interpolation, textStyleAliases)) {
				depthsWithTextStyle.add(depth)
			}

			index -= 1
			continue
		}

		if (char === "{") {
			depth += 1
			continue
		}

		if (char === "}") {
			depth = Math.max(0, depth - 1)
			continue
		}

		if (source.startsWith("display", index)) {
			const nextSemicolon = source.indexOf(";", index)
			const declaration = source.slice(
				index,
				nextSemicolon === -1 ? source.length : nextSemicolon + 1,
			)

			if (DISPLAY_LAYOUT_RE.test(declaration)) {
				depthsWithLayout.add(depth)
			}
		}
	}

	for (const textStyleDepth of depthsWithTextStyle) {
		if (depthsWithLayout.has(textStyleDepth)) return true
	}

	return false
}

function findNearestMixedStyleNode(
	node: AstNode,
	getText: (node: AstNode) => string,
	textStyleAliases: Set<string>,
): AstNode | null {
	const source = getText(node)
	if (!sameLevelTextStyleAndLayout(source, textStyleAliases)) return null

	let nestedMatch: AstNode | null = null
	forEachChild(node, (child) => {
		if (nestedMatch) return
		nestedMatch = findNearestMixedStyleNode(child, getText, textStyleAliases)
	})

	if (nestedMatch) return nestedMatch

	if (
		node.type === "TaggedTemplateExpression" ||
		node.type === "ObjectExpression" ||
		node.type === "ArrayExpression" ||
		node.type === "CallExpression"
	) {
		return node
	}

	return null
}

function getImportedName(imported: unknown) {
	if (!isNode(imported)) return null
	if (imported.type === "Identifier")
		return typeof imported.name === "string" ? imported.name : null
	if (imported.type === "StringLiteral")
		return typeof imported.value === "string" ? imported.value : null
	return null
}

function getNodeArray(value: unknown) {
	return Array.isArray(value) ? value.filter(isNode) : []
}

const noLayoutTextStyle = {
	meta: {
		type: "problem",
		docs: {
			description: "disallow Capsize text styles on likely layout containers",
		},
		messages: {
			layoutTextStyle:
				"Capsize text styles emit ::before/::after pseudo-elements. Apply this text style to the direct text element, not a flex/grid layout container.",
		},
	},
	create(context: {
		sourceCode: { getText: (node: AstNode) => string }
		report: (diagnostic: { node: AstNode; messageId: string }) => void
	}) {
		const styledNames = new Set<string>()
		const textStyleObjects = new Set<string>()
		const textStyleAliases = new Set<string>()
		const reported = new Set<string>()

		function getText(node: AstNode) {
			return context.sourceCode.getText(node)
		}

		function reportMixedStyle(node: AstNode) {
			const key = `${node.start}:${node.end}`
			if (reported.has(key)) return
			reported.add(key)

			context.report({
				node,
				messageId: "layoutTextStyle",
			})
		}

		function trackTextStyleAlias(node: AstNode) {
			const id = node.id
			const init = node.init
			if (!isNode(id) || id.type !== "Identifier" || !isNode(init)) return

			const source = getText(init)
			if (containsTextStyleReference(source, textStyleObjects)) {
				textStyleAliases.add(id.name as string)
			}
		}

		function inspectStyleExpression(node: AstNode | null | undefined) {
			if (!node) return

			const mixedNode = findNearestMixedStyleNode(
				node,
				getText,
				textStyleAliases,
			)
			if (mixedNode) reportMixedStyle(mixedNode)
		}

		return {
			ImportDeclaration(node: AstNode) {
				const source = node.source
				if (!isNode(source) || source.type !== "StringLiteral") return

				const importSource = source.value
				if (
					importSource === "library/styled" ||
					importSource === "library/styled/alpha"
				) {
					for (const specifier of getNodeArray(node.specifiers)) {
						if (
							specifier.type === "ImportSpecifier" &&
							getImportedName(specifier.imported) === "styled"
						) {
							const local = specifier.local
							if (isNode(local) && local.type === "Identifier")
								styledNames.add(local.name as string)
						}
					}
				}

				if (importSource === "app/styles/text") {
					for (const specifier of getNodeArray(node.specifiers)) {
						if (
							specifier.type === "ImportDefaultSpecifier" ||
							specifier.type === "ImportNamespaceSpecifier"
						) {
							const local = specifier.local
							if (isNode(local) && local.type === "Identifier")
								textStyleObjects.add(local.name as string)
						}
					}
				}
			},
			VariableDeclarator(node: AstNode) {
				trackTextStyleAlias(node)
				if (isNode(node.init)) inspectStyleExpression(node.init)
			},
			CallExpression(node: AstNode) {
				if (!isStyledCall(node, styledNames)) return

				for (const argument of getNodeArray(node.arguments).slice(1)) {
					inspectStyleExpression(argument)
				}
			},
		}
	},
}

export default {
	meta: {
		name: "eslint-plugin-capsize",
	},
	rules: {
		"no-layout-text-style": noLayoutTextStyle,
	},
}
