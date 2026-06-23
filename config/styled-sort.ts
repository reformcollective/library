type AstNode = {
	type: string
	start: number
	end: number
	[key: string]: unknown
}

type RuleContext = {
	sourceCode: { getText: (node?: AstNode) => string; text: string }
	report: (diagnostic: {
		node: AstNode
		message: string
		fix?: (fixer: {
			replaceTextRange: (range: [number, number], text: string) => unknown
		}) => unknown
	}) => void
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

function getNodeArray(value: unknown) {
	return Array.isArray(value) ? value.filter(isNode) : []
}

function getIdentifierName(node: unknown) {
	return isNode(node) &&
		node.type === "Identifier" &&
		typeof node.name === "string"
		? node.name
		: null
}

function isStyledSortDeclaration(node: AstNode) {
	if (node.type !== "VariableDeclaration") return false

	const [declaration] = getNodeArray(node.declarations)
	const init = declaration?.init
	if (!isNode(init) || init.type !== "TaggedTemplateExpression") return false

	const tag = init.tag
	if (!isNode(tag)) return false

	if (tag.type === "Identifier") {
		return tag.name === "css" || tag.name === "keyframes"
	}

	if (tag.type === "MemberExpression") {
		const object = tag.object
		return (
			isNode(object) && object.type === "Identifier" && object.name === "styled"
		)
	}

	if (tag.type !== "CallExpression") return false

	const callee = tag.callee
	if (
		isNode(callee) &&
		callee.type === "Identifier" &&
		callee.name === "styled"
	) {
		return true
	}

	if (!isNode(callee) || callee.type !== "MemberExpression") return false

	const object = callee.object
	if (!isNode(object) || object.type !== "MemberExpression") return false

	const nestedObject = object.object
	return (
		isNode(nestedObject) &&
		nestedObject.type === "Identifier" &&
		nestedObject.name === "styled"
	)
}

function getFirstDeclarationName(node: AstNode) {
	const [declaration] = getNodeArray(node.declarations)
	return getIdentifierName(declaration?.id)
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

function collectIdentifierDependencies(
	node: AstNode,
	callback: (name: string) => void,
) {
	forEachChild(node, (child) => {
		const name = getIdentifierName(child)
		if (name) {
			callback(name)
			return
		}

		collectIdentifierDependencies(child, callback)
	})
}

function addDependency(
	dependencies: Record<string, string[] | undefined>,
	dependencyName: string,
	dependentName: string,
) {
	dependencies[dependencyName] ??= []
	dependencies[dependencyName].push(dependentName)
}

function getSourceText(context: RuleContext) {
	return context.sourceCode.text || context.sourceCode.getText()
}

const sortStyledComponents = {
	meta: {
		type: "layout",
		fixable: "whitespace",
		docs: {
			description: "sort styled component declarations by JSX usage order",
		},
	},
	create(context: RuleContext) {
		return {
			Program(node: AstNode) {
				const allVariableDeclarations = getNodeArray(node.body).filter(
					isStyledSortDeclaration,
				)
				const variableNames: string[] = []
				const variableAST: Record<string, AstNode> = {}
				const variablePositions: Record<string, number> = {}
				const dependencies: Record<string, string[] | undefined> = {}

				allVariableDeclarations.forEach((variableDeclaration, index) => {
					const nameOfVariable = getFirstDeclarationName(variableDeclaration)
					if (!nameOfVariable) return

					variableNames.push(nameOfVariable)
					variableAST[nameOfVariable] = variableDeclaration
					variablePositions[nameOfVariable] = index

					for (const declaration of getNodeArray(
						variableDeclaration.declarations,
					)) {
						const init = declaration.init
						if (!isNode(init)) continue

						const tag = init.tag
						if (isNode(tag)) {
							for (const argument of getNodeArray(tag.arguments)) {
								const argumentName = getIdentifierName(argument)
								if (argumentName) {
									addDependency(dependencies, argumentName, nameOfVariable)
								}
							}
						}

						collectIdentifierDependencies(init, (dependencyName) => {
							addDependency(dependencies, dependencyName, nameOfVariable)
						})
					}
				})

				const sourceText = getSourceText(context)
				const desiredOrder = variableNames.sort().sort((a, b) => {
					let aIndex1 = sourceText.indexOf(`<${a}>`)
					let bIndex1 = sourceText.indexOf(`<${b}>`)
					let aIndex2 = sourceText.indexOf(`<${a} `)
					let bIndex2 = sourceText.indexOf(`<${b} `)
					let aIndex3 = sourceText.indexOf(`<${a}\n`)
					let bIndex3 = sourceText.indexOf(`<${b}\n`)

					if (aIndex1 === -1) aIndex1 = Infinity
					if (bIndex1 === -1) bIndex1 = Infinity
					if (aIndex2 === -1) aIndex2 = Infinity
					if (bIndex2 === -1) bIndex2 = Infinity
					if (aIndex3 === -1) aIndex3 = Infinity
					if (bIndex3 === -1) bIndex3 = Infinity

					const aIndex = Math.min(aIndex1, aIndex2, aIndex3)
					const bIndex = Math.min(bIndex1, bIndex2, bIndex3)

					if (aIndex === bIndex) return 0
					return aIndex > bIndex ? 1 : -1
				})

				const adjustOrder = () => {
					desiredOrder.forEach((variable, index) => {
						if (!dependencies[variable]) return

						let smallestDependencyIndex = Infinity
						for (const dependency of dependencies[variable]) {
							const dependencyIndex = desiredOrder.indexOf(dependency)
							if (dependencyIndex < smallestDependencyIndex) {
								smallestDependencyIndex = dependencyIndex
							}
						}

						if (smallestDependencyIndex < index) {
							desiredOrder.splice(index, 1)
							desiredOrder.splice(smallestDependencyIndex, 0, variable)
						}
					})
				}

				let lastOrder = ""
				while (lastOrder !== desiredOrder.join(", ")) {
					lastOrder = desiredOrder.join(", ")
					adjustOrder()
				}

				desiredOrder.forEach((variable, index) => {
					const variablePosition = variablePositions[variable]
					if (variablePosition === undefined || variablePosition >= index)
						return

					const previousVariable = desiredOrder[index - 1]
					if (!previousVariable) return

					const nodeToReportAt = getNodeArray(
						variableAST[variable]?.declarations,
					)[0]?.id
					const nodeToMove = variableAST[variable]
					const nodeToReference = variableAST[previousVariable]
					if (!isNode(nodeToReportAt) || !isNode(nodeToReference)) return
					if (!isNode(nodeToMove)) return

					context.report({
						node: nodeToReportAt,
						message: `Declaration of ${variable} should be after ${previousVariable}`,
						fix(fixer) {
							const textBetweenNodes = sourceText.slice(
								nodeToMove.end,
								nodeToReference.start - 1,
							)

							return fixer.replaceTextRange(
								[nodeToMove.start, nodeToReference.end],
								`${textBetweenNodes}\n\n${context.sourceCode.getText(
									nodeToReference,
								)}\n\n${context.sourceCode.getText(nodeToMove)}`,
							)
						},
					})
				})
			},
		}
	},
}

export default {
	meta: {
		name: "eslint-plugin-styled-sort",
	},
	rules: {
		"sort-styled-components": sortStyledComponents,
	},
}
