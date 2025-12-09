import ts from "typescript"

// =============================================================================
// Types
// =============================================================================

export type NodeKind =
	| "import"
	| "variable"
	| "function"
	| "class"
	| "expression"
	| "statement"
	| "type"
	| "export"

export interface ImportInfo {
	/** The module specifier (e.g., "@vanilla-extract/css") */
	module: string
	/** The imported name ("default", "*", or the specific named import) */
	importedName: string
	/** Whether this is a type-only import */
	isTypeOnly: boolean
}

export interface ExportInfo {
	/** The exported name */
	name: string
	/** Whether this is a default export */
	isDefault: boolean
}

export interface DependencyNode {
	/** Unique id for ordering and deduplication */
	id: number
	/** The kind of top-level construct */
	kind: NodeKind
	/** The name of the binding (undefined for expression statements) */
	name?: string
	/** The original AST statement node */
	statement: ts.Statement
	/** Names of other bindings this node depends on */
	dependsOn: string[]
	/** Import metadata (only for kind: "import") */
	importInfo?: ImportInfo
	/** Export metadata (if this node is exported) */
	exportInfo?: ExportInfo
}

export interface DependencyGraph {
	/** The parsed source file */
	sourceFile: ts.SourceFile
	/** All nodes keyed by name (or internal key for expressions) */
	nodes: Map<string, DependencyNode>
	/** All nodes in original source order */
	ordered: DependencyNode[]
}

// =============================================================================
// Analysis
// =============================================================================

export interface AnalyzeOptions {
	isTsx?: boolean
}

/**
 * Parses source code and builds a typed dependency graph.
 */
export function analyzeDependencies(
	sourceCode: string,
	options: AnalyzeOptions = {},
): DependencyGraph {
	const { isTsx = true } = options

	const sourceFile = ts.createSourceFile(
		isTsx ? "file.tsx" : "file.ts",
		sourceCode,
		ts.ScriptTarget.Latest,
		true,
		isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	)

	const definedNames = new Set<string>()
	const nodes = new Map<string, DependencyNode>()
	const ordered: DependencyNode[] = []

	let statementId = 0

	// --- Helper: check if identifier is a lowercase JSX tag name ---
	const isIntrinsicJsxTag = (id: ts.Identifier): boolean => {
		const parent = id.parent
		if (!parent) return false
		const firstChar = id.text[0]
		if (!firstChar || firstChar !== firstChar.toLowerCase()) return false
		return (
			ts.isJsxOpeningElement(parent) ||
			ts.isJsxClosingElement(parent) ||
			ts.isJsxSelfClosingElement(parent)
		)
	}

	// --- Helper: collect all identifier references in a node ---
	const collectDependencies = (
		node: ts.Node,
		excludeName?: string,
	): string[] => {
		const deps = new Set<string>()
		const visit = (n: ts.Node) => {
			if (ts.isIdentifier(n)) {
				if (definedNames.has(n.text) && n.text !== excludeName) {
					if (!isIntrinsicJsxTag(n)) {
						deps.add(n.text)
					}
				}
			}
			ts.forEachChild(n, visit)
		}
		visit(node)
		return Array.from(deps)
	}

	// --- Pass 1: Inventory all defined names ---
	for (const stmt of sourceFile.statements) {
		if (ts.isVariableStatement(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				if (ts.isIdentifier(decl.name)) {
					definedNames.add(decl.name.text)
				}
			}
		} else if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
			if (stmt.name) {
				definedNames.add(stmt.name.text)
			}
		} else if (ts.isImportDeclaration(stmt) && stmt.importClause) {
			const clause = stmt.importClause
			if (clause.name) {
				definedNames.add(clause.name.text)
			}
			if (clause.namedBindings) {
				if (ts.isNamedImports(clause.namedBindings)) {
					for (const el of clause.namedBindings.elements) {
						definedNames.add(el.name.text)
					}
				} else if (ts.isNamespaceImport(clause.namedBindings)) {
					definedNames.add(clause.namedBindings.name.text)
				}
			}
		}
	}

	// --- Pass 2: Build nodes ---
	for (const stmt of sourceFile.statements) {
		const id = statementId++

		// 1. IMPORTS
		if (ts.isImportDeclaration(stmt)) {
			const moduleSpec = (stmt.moduleSpecifier as ts.StringLiteral).text
			const clause = stmt.importClause
			const isTypeOnlyImport = clause?.isTypeOnly ?? false

			if (!clause) {
				// Side-effect import: import 'foo'
				const key = `__expr_${id}`
				const node: DependencyNode = {
					id,
					kind: "import",
					statement: stmt,
					dependsOn: [],
					importInfo: {
						module: moduleSpec,
						importedName: "*",
						isTypeOnly: false,
					},
				}
				nodes.set(key, node)
				ordered.push(node)
				continue
			}

			// Default import
			if (clause.name) {
				const name = clause.name.text
				const node: DependencyNode = {
					id,
					kind: "import",
					name,
					statement: stmt,
					dependsOn: [],
					importInfo: {
						module: moduleSpec,
						importedName: "default",
						isTypeOnly: isTypeOnlyImport,
					},
				}
				nodes.set(name, node)
				ordered.push(node)
			}

			// Named bindings
			if (clause.namedBindings) {
				if (ts.isNamedImports(clause.namedBindings)) {
					for (const el of clause.namedBindings.elements) {
						const localName = el.name.text
						const importedName = el.propertyName?.text ?? localName
						const isElementTypeOnly = el.isTypeOnly || isTypeOnlyImport

						const node: DependencyNode = {
							id,
							kind: "import",
							name: localName,
							statement: stmt,
							dependsOn: [],
							importInfo: {
								module: moduleSpec,
								importedName,
								isTypeOnly: isElementTypeOnly,
							},
						}
						nodes.set(localName, node)
						ordered.push(node)
					}
				} else if (ts.isNamespaceImport(clause.namedBindings)) {
					const name = clause.namedBindings.name.text
					const node: DependencyNode = {
						id,
						kind: "import",
						name,
						statement: stmt,
						dependsOn: [],
						importInfo: {
							module: moduleSpec,
							importedName: "*",
							isTypeOnly: isTypeOnlyImport,
						},
					}
					nodes.set(name, node)
					ordered.push(node)
				}
			}
			continue
		}

		// 2. VARIABLES
		if (ts.isVariableStatement(stmt)) {
			const isExported =
				stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ??
				false

			for (const decl of stmt.declarationList.declarations) {
				if (!ts.isIdentifier(decl.name)) continue

				const name = decl.name.text
				const deps = collectDependencies(decl.initializer ?? decl, name)

				const node: DependencyNode = {
					id,
					kind: "variable",
					name,
					statement: stmt,
					dependsOn: deps,
				}

				if (isExported) {
					node.exportInfo = { name, isDefault: false }
				}

				nodes.set(name, node)
				ordered.push(node)
			}
			continue
		}

		// 3. FUNCTIONS
		if (ts.isFunctionDeclaration(stmt)) {
			const isExported =
				(ts.getCombinedModifierFlags(stmt) & ts.ModifierFlags.Export) !== 0
			const isDefault =
				(ts.getCombinedModifierFlags(stmt) & ts.ModifierFlags.Default) !== 0
			const name = stmt.name?.text ?? (isDefault ? "default" : undefined)

			if (name) {
				const deps = collectDependencies(stmt, name)
				const node: DependencyNode = {
					id,
					kind: "function",
					name,
					statement: stmt,
					dependsOn: deps,
				}

				if (isExported) {
					node.exportInfo = { name: isDefault ? "default" : name, isDefault }
				}

				nodes.set(name, node)
				ordered.push(node)
			}
			continue
		}

		// 4. CLASSES
		if (ts.isClassDeclaration(stmt)) {
			const isExported =
				(ts.getCombinedModifierFlags(stmt) & ts.ModifierFlags.Export) !== 0
			const isDefault =
				(ts.getCombinedModifierFlags(stmt) & ts.ModifierFlags.Default) !== 0
			const name = stmt.name?.text ?? (isDefault ? "default" : undefined)

			if (name) {
				const deps = collectDependencies(stmt, name)
				const node: DependencyNode = {
					id,
					kind: "class",
					name,
					statement: stmt,
					dependsOn: deps,
				}

				if (isExported) {
					node.exportInfo = { name: isDefault ? "default" : name, isDefault }
				}

				nodes.set(name, node)
				ordered.push(node)
			}
			continue
		}

		// 5. EXPRESSION STATEMENTS
		if (ts.isExpressionStatement(stmt)) {
			const key = `__expr_${id}`
			const deps = collectDependencies(stmt)
			const node: DependencyNode = {
				id,
				kind: "expression",
				statement: stmt,
				dependsOn: deps,
			}
			nodes.set(key, node)
			ordered.push(node)
			continue
		}

		// 6. BLOCK STATEMENTS (if, for, while, try, etc.) - treated like expressions
		if (
			ts.isIfStatement(stmt) ||
			ts.isForStatement(stmt) ||
			ts.isForInStatement(stmt) ||
			ts.isForOfStatement(stmt) ||
			ts.isWhileStatement(stmt) ||
			ts.isDoStatement(stmt) ||
			ts.isTryStatement(stmt) ||
			ts.isSwitchStatement(stmt) ||
			ts.isBlock(stmt)
		) {
			const key = `__stmt_${id}`
			const deps = collectDependencies(stmt)
			const node: DependencyNode = {
				id,
				kind: "statement",
				statement: stmt,
				dependsOn: deps,
			}
			nodes.set(key, node)
			ordered.push(node)
			continue
		}

		// 7. TYPE DECLARATIONS (type aliases, interfaces, enums)
		// These don't produce runtime code but should be preserved
		if (
			ts.isTypeAliasDeclaration(stmt) ||
			ts.isInterfaceDeclaration(stmt) ||
			ts.isEnumDeclaration(stmt)
		) {
			const name = stmt.name.text
			const node: DependencyNode = {
				id,
				kind: "type",
				name,
				statement: stmt,
				dependsOn: [], // Type declarations have no runtime dependencies
			}

			const isExported =
				(ts.getCombinedModifierFlags(stmt) & ts.ModifierFlags.Export) !== 0
			if (isExported) {
				node.exportInfo = { name, isDefault: false }
			}

			nodes.set(name, node)
			ordered.push(node)
			continue
		}

		// 8. EXPORT DECLARATIONS (re-exports, export { }, export default)
		if (ts.isExportDeclaration(stmt)) {
			const key = `__export_${id}`
			const deps = stmt.exportClause
				? collectDependencies(stmt.exportClause)
				: []
			const node: DependencyNode = {
				id,
				kind: "export",
				statement: stmt,
				dependsOn: deps,
			}
			nodes.set(key, node)
			ordered.push(node)
			continue
		}

		// 9. EXPORT ASSIGNMENT (export = something or export default expression)
		if (ts.isExportAssignment(stmt)) {
			const key = `__export_${id}`
			const deps = collectDependencies(stmt.expression)
			const node: DependencyNode = {
				id,
				kind: "export",
				statement: stmt,
				dependsOn: deps,
				exportInfo: { name: "default", isDefault: true },
			}
			nodes.set(key, node)
			ordered.push(node)
			continue
		}

		// 10. MODULE DECLARATIONS (declare module, namespace)
		if (ts.isModuleDeclaration(stmt)) {
			const key = `__module_${id}`
			const node: DependencyNode = {
				id,
				kind: "type",
				name: stmt.name.getText(),
				statement: stmt,
				dependsOn: [],
			}
			nodes.set(key, node)
			ordered.push(node)
			continue
		}

		// UNKNOWN STATEMENTS - throw error to alert developer
		const stmtText = stmt.getText(sourceFile).slice(0, 100)
		const stmtKind = ts.SyntaxKind[stmt.kind]
		throw new Error(
			`[vanilla-split-loader] Unhandled top-level statement type: ${stmtKind}\n` +
				`Preview: ${stmtText}${stmtText.length >= 100 ? "..." : ""}\n\n` +
				`This is a bug in the split loader. Please report it with the above information.`,
		)
	}

	return { sourceFile, nodes, ordered }
}
