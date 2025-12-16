/** biome-ignore-all lint/style/noNonNullAssertion: generated code */
import ts from "typescript"
import type { DependencyNode } from "./dependency-graph.ts"

// =============================================================================
// Types
// =============================================================================

export interface ReconstructOptions {
	/** Names to add 'export' keyword to */
	exportNames?: Set<string>
	/** Name -> replacement source code (replaces the entire statement) */
	transforms?: Map<string, string>
	/** Extra source strings to append at the end */
	append?: string[]
}

// =============================================================================
// Source reconstruction
// =============================================================================

/**
 * Reconstructs source code from a list of dependency nodes.
 * Handles deduplication, export addition, and source transforms.
 */
export function reconstructSource(
	nodes: DependencyNode[],
	options: ReconstructOptions = {},
): string {
	const {
		exportNames = new Set(),
		transforms = new Map(),
		append = [],
	} = options

	const seenIds = new Set<number>()
	const parts: string[] = []

	// Sort by id to preserve original source order
	const sorted = [...nodes].sort((a, b) => a.id - b.id)

	for (const node of sorted) {
		// Skip duplicates (same statement can create multiple nodes, e.g., multi-import)
		if (seenIds.has(node.id)) continue
		seenIds.add(node.id)

		// Check for a transform
		if (node.name && transforms.has(node.name)) {
			parts.push(transforms.get(node.name)!)
			continue
		}

		// Get the source text
		const sourceFile = node.statement.getSourceFile()
		let src = node.statement.getText(sourceFile)

		// Add export if needed and not already exported
		if (node.name && exportNames.has(node.name) && !node.exportInfo) {
			// Only add export to variable/function/class declarations
			if (
				node.kind === "variable" ||
				node.kind === "function" ||
				node.kind === "class"
			) {
				src = `export ${src}`
			}
		}

		parts.push(src)
	}

	// Append any extra statements
	for (const extra of append) {
		parts.push(extra)
	}

	return `${parts.join("\n")}\n`
}

// =============================================================================
// Import reconstruction helpers
// =============================================================================

/**
 * Builds a minimal import statement for the given nodes.
 * Groups imports by module and reconstructs them.
 */
export function reconstructImports(
	nodes: DependencyNode[],
	sourceFile: ts.SourceFile,
): string {
	// Group import nodes by their statement id (same import statement)
	const byStatementId = new Map<number, DependencyNode[]>()

	for (const node of nodes) {
		if (node.kind !== "import") continue
		const existing = byStatementId.get(node.id) ?? []
		existing.push(node)
		byStatementId.set(node.id, existing)
	}

	const parts: string[] = []

	// For each unique import statement, print it once
	const seenIds = new Set<number>()
	for (const node of nodes) {
		if (node.kind !== "import") continue
		if (seenIds.has(node.id)) continue
		seenIds.add(node.id)

		parts.push(node.statement.getText(sourceFile))
	}

	return parts.join("\n")
}

// =============================================================================
// Statement creation helpers
// =============================================================================

/**
 * Creates an import declaration AST node.
 */
export function createImportDeclaration(
	names: string[],
	fromPath: string,
): ts.ImportDeclaration {
	return ts.factory.createImportDeclaration(
		undefined,
		ts.factory.createImportClause(
			false,
			undefined,
			ts.factory.createNamedImports(
				names.map((n) =>
					ts.factory.createImportSpecifier(
						false,
						undefined,
						ts.factory.createIdentifier(n),
					),
				),
			),
		),
		ts.factory.createStringLiteral(fromPath),
	)
}

/**
 * Creates a re-export declaration AST node.
 */
export function createReExportDeclaration(
	names: string[],
	fromPath: string,
): ts.ExportDeclaration {
	return ts.factory.createExportDeclaration(
		undefined,
		false,
		ts.factory.createNamedExports(
			names.map((n) =>
				ts.factory.createExportSpecifier(
					false,
					undefined,
					ts.factory.createIdentifier(n),
				),
			),
		),
		ts.factory.createStringLiteral(fromPath),
	)
}

/**
 * Prints an AST node to a string.
 */
export function printNode(node: ts.Node): string {
	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
	const sourceFile = ts.createSourceFile("temp.ts", "", ts.ScriptTarget.Latest)
	return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile)
}

/**
 * Prints a source file to a string.
 */
export function printSourceFile(sourceFile: ts.SourceFile): string {
	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
	return printer.printFile(sourceFile)
}
