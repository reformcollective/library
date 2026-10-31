type AstNode = {
	type: string
	[key: string]: unknown
}

type RuleContext = {
	filename: string
	report: (diagnostic: { node: AstNode; messageId: string }) => void
}

const isNode = (value: unknown): value is AstNode =>
	typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string"

const isStyleMember = (node: unknown) =>
	isNode(node) &&
	node.type === "MemberExpression" &&
	isNode(node.property) &&
	((node.property.type === "Identifier" && node.property.name === "style") ||
		(node.property.type === "StringLiteral" && node.property.value === "style") ||
		(node.property.type === "Literal" && node.property.value === "style"))

const noInlineStyle = {
	meta: {
		type: "problem",
		docs: { description: "disallow inline styles" },
		messages: {
			inlineStyle:
				"No inline styles. Pass a token prop to the styled component (library/styled/README.md, tokens), or use gsap.set / gsap.to in animation code.",
		},
	},
	create(context: RuleContext) {
		return {
			JSXAttribute(node: AstNode) {
				if (isNode(node.name) && node.name.type === "JSXIdentifier" && node.name.name === "style") {
					context.report({ node, messageId: "inlineStyle" })
				}
			},
			AssignmentExpression(node: AstNode) {
				const left = node.left
				if (isNode(left) && left.type === "MemberExpression" && (isStyleMember(left.object) || isStyleMember(left))) {
					context.report({ node, messageId: "inlineStyle" })
				}
			},
			CallExpression(node: AstNode) {
				const callee = node.callee
				if (isNode(callee) && callee.type === "MemberExpression" && isStyleMember(callee.object)) {
					context.report({ node, messageId: "inlineStyle" })
					return
				}
				const isObjectAssign =
					isNode(callee) &&
					callee.type === "MemberExpression" &&
					isNode(callee.object) &&
					callee.object.type === "Identifier" &&
					callee.object.name === "Object" &&
					isNode(callee.property) &&
					callee.property.type === "Identifier" &&
					callee.property.name === "assign"
				const args = Array.isArray(node.arguments) ? node.arguments : []
				if (isObjectAssign && isStyleMember(args[0])) context.report({ node, messageId: "inlineStyle" })
			},
		}
	},
}

const isCssTag = (node: AstNode) =>
	node.type === "TaggedTemplateExpression" && isNode(node.tag) && node.tag.type === "Identifier" && node.tag.name === "css"

// Walks literal arrays and objects in a styled() config, stopping at calls like f.responsive()
function findBareCss(node: unknown, found: AstNode[]) {
	if (!isNode(node)) return
	if (isCssTag(node)) {
		found.push(node)
		return
	}
	if (node.type === "ArrayExpression" && Array.isArray(node.elements)) {
		for (const element of node.elements) findBareCss(element, found)
	}
	if (node.type === "ObjectExpression" && Array.isArray(node.properties)) {
		for (const property of node.properties) if (isNode(property)) findBareCss(property.value, found)
	}
}

const cssNeedsHelper = {
	meta: {
		type: "problem",
		docs: { description: "require an f.* helper around css passed to styled" },
		messages: {
			bareCss: "Wrap this css in f.responsive, f.small or another f.* helper, or pixel values will not scale.",
		},
	},
	create(context: RuleContext) {
		return {
			CallExpression(node: AstNode) {
				if (!isNode(node.callee) || node.callee.type !== "Identifier" || node.callee.name !== "styled") return
				const args = Array.isArray(node.arguments) ? node.arguments.slice(1) : []
				const found: AstNode[] = []
				for (const argument of args) findBareCss(argument, found)
				for (const bare of found) context.report({ node: bare, messageId: "bareCss" })
			},
		}
	},
}

const noRawImg = {
	meta: {
		type: "problem",
		docs: { description: "disallow raw img elements in site code" },
		messages: {
			rawImg: "Use StaticImage for raster assets or SanityImage for CMS images, not <img>.",
		},
	},
	create(context: RuleContext) {
		const path = context.filename.replaceAll("\\", "/")
		const siteCode = path.includes("/app/") && !path.includes("/app/visual-tests/") && !path.includes("/library/")
		if (!siteCode) return {}
		return {
			JSXOpeningElement(node: AstNode) {
				if (isNode(node.name) && node.name.type === "JSXIdentifier" && node.name.name === "img") {
					context.report({ node, messageId: "rawImg" })
				}
			},
		}
	},
}

export default {
	meta: {
		name: "eslint-plugin-reform",
	},
	rules: {
		"no-inline-style": noInlineStyle,
		"css-needs-helper": cssNeedsHelper,
		"no-raw-img": noRawImg,
	},
}
