import fsSync from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import turboLoaderRAW, {
	type TurboLoaderContext,
	type TurboLoaderOptions,
} from "@vanilla-extract/turbopack-plugin"
import ts from "typescript"
import {
	analyzeDependencies,
	type DependencyGraph,
	type DependencyNode,
} from "./dependency-graph.ts"
import {
	createImportDeclaration,
	createReExportDeclaration,
	printSourceFile,
	reconstructSource,
} from "./source-builder.ts"

// =============================================================================
// Configuration
// =============================================================================

type ModulesConfig = Record<string, string[]>

const TRACKED_MODULES: ModulesConfig = {
	"@vanilla-extract/css": [
		"style",
		"styleVariants",
		"createVar",
		"fallbackVar",
		"createTheme",
		"createThemeContract",
		"assignVars",
		"fontFace",
		"keyframes",
		"createContainer",
		"layer",
		"createViewTransition",
		"globalStyle",
		"createGlobalTheme",
		"createGlobalThemeContract",
		"globalFontFace",
		"createGlobalVar",
		"globalKeyframes",
		"globalLayer",
	],
	"library/styled/alpha": ["styled", "keyframes", "compileTime"],
}

const STYLED_MODULE = "library/styled/alpha"
const STYLED_IMPORT = "styled"

// @ts-expect-error turbopack loader shape has default export in some builds
const turboLoader = turboLoaderRAW.default as typeof turboLoaderRAW

// =============================================================================
// Tracked import registry
// =============================================================================

interface TrackedRegistry {
	/** Local names that are tracked imports (e.g., "style", "styled") */
	trackedNames: Set<string>
	/** Local name -> module specifier */
	localToModule: Map<string, string>
	/** Local name -> original imported name */
	localToImported: Map<string, string>
}

/**
 * Builds a registry of tracked imports from the dependency graph.
 */
function buildTrackedRegistry(graph: DependencyGraph): TrackedRegistry {
	const trackedNames = new Set<string>()
	const localToModule = new Map<string, string>()
	const localToImported = new Map<string, string>()

	for (const [name, node] of graph.nodes) {
		if (node.kind !== "import" || !node.importInfo) continue
		if (node.importInfo.isTypeOnly) continue

		const tracked = TRACKED_MODULES[node.importInfo.module]
		if (!tracked) continue

		if (tracked.includes(node.importInfo.importedName)) {
			trackedNames.add(name)
			localToModule.set(name, node.importInfo.module)
			localToImported.set(name, node.importInfo.importedName)
		}
	}

	return { trackedNames, localToModule, localToImported }
}

// =============================================================================
// Taint analysis
// =============================================================================

interface TaintResult {
	/** All tainted node names (directly or transitively use tracked functions) */
	tainted: Set<string>
	/** Tainted functions/classes that can't be moved (should error) */
	invalidTainted: DependencyNode[]
}

/**
 * Computes which nodes are "tainted" by tracked function usage.
 * A node is tainted if it directly calls a tracked function.
 * Functions/classes that are tainted are invalid (can't move to .css.ts).
 */
function isVariableFunctionLike(node: DependencyNode): boolean {
	if (node.kind !== "variable") return false
	const stmt = node.statement
	if (!ts.isVariableStatement(stmt)) return false

	for (const decl of stmt.declarationList.declarations) {
		if (!ts.isIdentifier(decl.name) || decl.name.text !== node.name) continue
		const init = decl.initializer
		if (!init) continue
		if (
			ts.isArrowFunction(init) ||
			ts.isFunctionExpression(init) ||
			ts.isClassExpression(init)
		) {
			return true
		}
	}
	return false
}

function computeTaintedNodes(
	graph: DependencyGraph,
	registry: TrackedRegistry,
): TaintResult {
	const tainted = new Set<string>()
	const invalidTainted: DependencyNode[] = []

	for (const [name, node] of graph.nodes) {
		if (node.kind === "import") continue

		// Check if this node directly depends on a tracked function
		const usesTracked = node.dependsOn.some((dep) =>
			registry.trackedNames.has(dep),
		)

		if (usesTracked) {
			if (node.name) tainted.add(node.name)
			else tainted.add(name) // expression statement key

			// Functions and classes can't be moved to .css.ts
			// Also catch arrow functions/function expressions assigned to variables
			if (
				node.kind === "function" ||
				node.kind === "class" ||
				isVariableFunctionLike(node)
			) {
				invalidTainted.push(node)
			}
		}
	}

	return { tainted, invalidTainted }
}

// =============================================================================
// Styled component handling
// =============================================================================

interface StyledTransform {
	/** Original variable name */
	originalName: string
	/** Name for the raw component (e.g., "Button___raw") */
	rawName: string
	/** Source for the raw component in virtual module */
	rawSource: string
	/** The first argument to styled() that should be excluded from virtual deps */
	excludedDep?: string
	/** Whether this is a styled(Component) vs styled('tag') call */
	needsWrapper: boolean
}

/**
 * Analyzes styled() calls and produces transforms.
 */
function analyzeStyledCalls(
	graph: DependencyGraph,
	registry: TrackedRegistry,
	tainted: Set<string>,
): StyledTransform[] {
	const transforms: StyledTransform[] = []

	for (const name of tainted) {
		const node = graph.nodes.get(name)
		if (!node || node.kind !== "variable" || !node.name) continue

		// Check if this is a styled() call
		const styledLocal = Array.from(registry.trackedNames).find((local) => {
			const mod = registry.localToModule.get(local)
			const imp = registry.localToImported.get(local)
			return mod === STYLED_MODULE && imp === STYLED_IMPORT
		})

		if (!styledLocal || !node.dependsOn.includes(styledLocal)) continue

		// Parse the initializer to understand the call
		const stmt = node.statement
		if (!ts.isVariableStatement(stmt)) continue

		const decl = stmt.declarationList.declarations.find(
			(d) => ts.isIdentifier(d.name) && d.name.text === node.name,
		)
		if (!decl?.initializer || !ts.isCallExpression(decl.initializer)) continue

		const call = decl.initializer
		const args = call.arguments
		const firstArg = args[0]

		const isStringTag =
			firstArg &&
			(ts.isStringLiteral(firstArg) ||
				ts.isNoSubstitutionTemplateLiteral(firstArg))

		if (isStringTag) {
			// styled('tag', config) -> move entirely, add debugId
			const firstArgText = firstArg.getText(graph.sourceFile)
			const restArgs = args.slice(1)
			const restArgsText = restArgs
				.map((a) => a.getText(graph.sourceFile))
				.join(", ")

			const rawSource =
				restArgs.length > 0
					? `export const ${node.name} = styled(${firstArgText}, ${restArgsText}, ${JSON.stringify(node.name)});`
					: `export const ${node.name} = styled(${firstArgText});`

			transforms.push({
				originalName: node.name,
				rawName: node.name,
				rawSource,
				needsWrapper: false,
			})
		} else {
			// styled(Component, config) -> split into raw + wrapper
			const rawName = `${node.name}___raw`
			const restArgs = args.slice(1)
			const restArgsText = restArgs
				.map((a) => a.getText(graph.sourceFile))
				.join(", ")

			const rawSource = restArgsText
				? `export const ${rawName} = styled("div", ${restArgsText}, ${JSON.stringify(node.name)});`
				: `export const ${rawName} = styled("div");`

			const excludedDep =
				firstArg && ts.isIdentifier(firstArg) ? firstArg.text : undefined

			transforms.push({
				originalName: node.name,
				rawName,
				rawSource,
				excludedDep,
				needsWrapper: true,
			})
		}
	}

	return transforms
}

// =============================================================================
// Partitioning
// =============================================================================

interface SplitPartition {
	/** Nodes for the virtual .css.ts module */
	virtual: DependencyNode[]
	/** Nodes that stay in the original file */
	original: DependencyNode[]
	/** Names to re-export from original (tainted + exported) */
	reexports: string[]
	/** Names to import from virtual module */
	imports: string[]
}

/**
 * Computes the transitive closure of dependencies for a set of seeds.
 */
function getTransitiveClosure(
	graph: DependencyGraph,
	seeds: Set<string>,
	exclude: Set<string> = new Set(),
): Set<string> {
	const closure = new Set<string>()
	const queue = [...seeds]

	while (queue.length > 0) {
		const name = queue.pop()!
		if (closure.has(name)) continue
		// Only exclude non-seed dependencies (seeds themselves should always be included)
		if (exclude.has(name) && !seeds.has(name)) continue

		closure.add(name)

		const node = graph.nodes.get(name)
		if (!node) continue

		for (const dep of node.dependsOn) {
			// Exclude deps that aren't themselves seeds
			const shouldExclude = exclude.has(dep) && !seeds.has(dep)
			if (!closure.has(dep) && !shouldExclude) {
				queue.push(dep)
			}
		}
	}

	return closure
}

/**
 * Computes which nodes are used by nodes outside the virtual closure.
 * Returns a set of names that need to stay in the original file.
 */
function computeOriginalDependencies(
	graph: DependencyGraph,
	virtualClosure: Set<string>,
	wrappedNames: Set<string>,
	excludedDeps: Set<string>,
	tainted: Set<string>,
): Set<string> {
	const neededInOriginal = new Set<string>()

	// Start with nodes that MUST be in original:
	// 1. Nodes outside virtual closure (they're not moved)
	// 2. Wrapped styled components (they stay with rewrite, but their ORIGINAL deps don't)
	// 3. Excluded deps (first args of styled(Component) calls)
	for (const node of graph.nodes.values()) {
		const key = node.name ?? `__expr_${node.id}`
		const inClosure = virtualClosure.has(key)

		if (!inClosure || excludedDeps.has(key)) {
			neededInOriginal.add(key)
		}
		// Wrapped names stay but their deps are handled specially below
	}

	// Now compute transitive closure of dependencies FROM original-only nodes
	// Key insight: we should NOT follow deps of TAINTED nodes because their
	// original declarations are being removed (replaced with imports from virtual)
	const queue = [...neededInOriginal]
	const visited = new Set<string>()

	while (queue.length > 0) {
		const name = queue.pop()!
		if (visited.has(name)) continue
		visited.add(name)

		const node = graph.nodes.get(name)
		if (!node) continue

		// Don't follow deps of tainted nodes - their code is being replaced
		// with imports from virtual, so their original deps aren't needed
		const isTainted = tainted.has(name)
		if (isTainted) {
			continue
		}

		// Follow deps of non-tainted nodes
		for (const dep of node.dependsOn) {
			if (!visited.has(dep)) {
				neededInOriginal.add(dep)
				queue.push(dep)
			}
		}
	}

	// Wrapped components themselves need to stay (for the rewrite)
	for (const name of wrappedNames) {
		neededInOriginal.add(name)
	}

	return neededInOriginal
}

/**
 * Partitions nodes between virtual and original modules.
 */
function partitionNodes(
	graph: DependencyGraph,
	tainted: Set<string>,
	styledTransforms: StyledTransform[],
): SplitPartition {
	// Build exclusion set (first args of styled(Component) calls)
	const excludedDeps = new Set<string>()
	for (const t of styledTransforms) {
		if (t.excludedDep) excludedDeps.add(t.excludedDep)
	}

	// Compute transitive closure for virtual module
	const virtualClosure = getTransitiveClosure(graph, tainted, excludedDeps)

	// Tainted names that have wrappers stay in original differently
	const wrappedNames = new Set(
		styledTransforms.filter((t) => t.needsWrapper).map((t) => t.originalName),
	)

	// Compute which nodes are actually needed in original
	const neededInOriginal = computeOriginalDependencies(
		graph,
		virtualClosure,
		wrappedNames,
		excludedDeps,
		tainted,
	)

	const virtual: DependencyNode[] = []
	const original: DependencyNode[] = []
	const reexports: string[] = []
	const imports: string[] = []

	for (const node of graph.ordered) {
		const key = node.name ?? `__expr_${node.id}`
		const inClosure = virtualClosure.has(key)
		const isTainted = tainted.has(key)

		if (inClosure) {
			virtual.push(node)
		}

		// Original file keeps:
		// - Nodes needed by other original nodes (computed above)
		// - Wrapped styled components (they get rewritten)
		// - But NOT tainted nodes (unless wrapped)
		const isNeeded = neededInOriginal.has(key)
		const isWrapped = wrappedNames.has(key)

		if (isNeeded && (!isTainted || isWrapped)) {
			original.push(node)
		}

		// Track what needs to be imported/re-exported
		if (isTainted && node.name) {
			// Only import runtime values (variables, functions, classes)
			// Skip types, expressions, statements, exports
			const isRuntimeValue =
				node.kind === "variable" ||
				node.kind === "function" ||
				node.kind === "class"
			if (isRuntimeValue) {
				// For wrapped components, import the ___raw version
				const transform = styledTransforms.find(
					(t) => t.originalName === node.name,
				)
				if (transform?.needsWrapper) {
					imports.push(transform.rawName)
					// Also import the base component if it's tainted (moved to virtual)
					if (transform.excludedDep && tainted.has(transform.excludedDep)) {
						imports.push(transform.excludedDep)
					}
				} else {
					imports.push(node.name)
				}
			}

			if (node.exportInfo) {
				reexports.push(node.name)
			}
		}
	}

	// Dedupe imports
	return { virtual, original, reexports, imports: [...new Set(imports)] }
}

// =============================================================================
// Source building
// =============================================================================

/**
 * Builds the virtual module source code.
 */
function buildVirtualSource(
	graph: DependencyGraph,
	partition: SplitPartition,
	tainted: Set<string>,
	styledTransforms: StyledTransform[],
): string {
	// Build transforms map: tainted names get their raw source
	const transforms = new Map<string, string>()
	const append: string[] = []

	for (const t of styledTransforms) {
		if (t.needsWrapper) {
			// Skip the original declaration, append the ___raw version
			transforms.set(t.originalName, "") // empty = skip
			append.push(t.rawSource)
		} else {
			// Replace with the transformed version
			transforms.set(t.originalName, t.rawSource)
		}
	}

	// Export names: all tainted variables (not expressions)
	const exportNames = new Set<string>()
	for (const name of tainted) {
		const node = graph.nodes.get(name)
		if (node && node.kind === "variable" && node.name) {
			exportNames.add(node.name)
		}
	}

	// Filter out empty transforms and reconstruct
	const nodesToInclude = partition.virtual.filter((n) => {
		if (n.name && transforms.get(n.name) === "") return false
		return true
	})

	return reconstructSource(nodesToInclude, {
		exportNames,
		transforms,
		append,
	})
}

/**
 * Checks if a statement is a directive prologue (e.g., "use client", "use strict")
 */
function isDirectivePrologue(stmt: ts.Statement): boolean {
	if (!ts.isExpressionStatement(stmt)) return false
	const expr = stmt.expression
	return ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)
}

/**
 * Builds the transformed original module statements.
 */
function buildOriginalStatements(
	_graph: DependencyGraph,
	partition: SplitPartition,
	tainted: Set<string>,
	styledTransforms: StyledTransform[],
	importPath: string,
): ts.Statement[] {
	const statements: ts.Statement[] = []
	const seenIds = new Set<number>()

	// Maps for styled wrapper rewrites
	const wrapperTransforms = new Map<string, StyledTransform>()
	for (const t of styledTransforms) {
		if (t.needsWrapper) {
			wrapperTransforms.set(t.originalName, t)
		}
	}

	// Track if we need withComponent helper
	const needsWithComponent = wrapperTransforms.size > 0

	// Find last import index for injection point (AFTER any directive prologues)
	let lastImportIdx = -1
	let lastDirectiveIdx = -1

	for (const node of partition.original) {
		if (seenIds.has(node.id)) continue
		seenIds.add(node.id)

		const key = node.name ?? `__expr_${node.id}`
		const isTainted = tainted.has(key)

		// Skip tainted nodes that aren't wrapped (they moved to virtual)
		if (isTainted && !wrapperTransforms.has(key)) {
			continue
		}

		// Handle wrapped styled components
		if (node.name && wrapperTransforms.has(node.name)) {
			const transform = wrapperTransforms.get(node.name)!
			const stmt = node.statement as ts.VariableStatement

			// Find the declaration
			const decl = stmt.declarationList.declarations.find(
				(d) => ts.isIdentifier(d.name) && d.name.text === node.name,
			)
			if (decl?.initializer && ts.isCallExpression(decl.initializer)) {
				const firstArg = decl.initializer.arguments[0]

				// Create: const Name = withComponent(FirstArg, Name___raw)
				const newInit = ts.factory.createCallExpression(
					ts.factory.createIdentifier("withComponent"),
					undefined,
					[
						firstArg ?? ts.factory.createIdentifier("undefined"),
						ts.factory.createIdentifier(transform.rawName),
					],
				)

				const newDecl = ts.factory.updateVariableDeclaration(
					decl,
					decl.name,
					decl.exclamationToken,
					decl.type,
					newInit,
				)

				const newDeclList = ts.factory.updateVariableDeclarationList(
					stmt.declarationList,
					[newDecl],
				)

				const newStmt = ts.factory.updateVariableStatement(
					stmt,
					stmt.modifiers,
					newDeclList,
				)

				statements.push(newStmt)
				if (node.kind === "import") lastImportIdx = statements.length - 1
				continue
			}
		}

		statements.push(node.statement)
		if (node.kind === "import") {
			lastImportIdx = statements.length - 1
		} else if (isDirectivePrologue(node.statement) && lastImportIdx === -1) {
			// Track directive prologues that come before any imports
			lastDirectiveIdx = statements.length - 1
		}
	}

	// Inject imports after last import, or after directives if no imports exist
	const insertAt = lastImportIdx >= 0 ? lastImportIdx + 1 : lastDirectiveIdx + 1
	const toInsert: ts.Statement[] = []

	if (needsWithComponent) {
		toInsert.push(
			createImportDeclaration(
				["withComponent"],
				"library/styled/withComponent",
			),
		)
	}

	if (partition.imports.length > 0) {
		toInsert.push(createImportDeclaration(partition.imports, importPath))
	}

	if (partition.reexports.length > 0) {
		toInsert.push(createReExportDeclaration(partition.reexports, importPath))
	}

	statements.splice(insertAt, 0, ...toInsert)

	return statements
}

// =============================================================================
// Import path rewriting
// =============================================================================

/**
 * Rewrites relative imports to tsconfig-safe specifiers.
 */
function rewriteToTsconfig(
	code: string,
	originalFilePath: string,
	rootDir: string,
): string {
	const sf = ts.createSourceFile(
		"rewrite.ts",
		code,
		ts.ScriptTarget.ES2020,
		true,
		ts.ScriptKind.TS,
	)

	const updates: Array<{ node: ts.ImportDeclaration; newSpec: string }> = []

	for (const st of sf.statements) {
		if (!ts.isImportDeclaration(st)) continue
		const spec = (st.moduleSpecifier as ts.StringLiteral).text
		if (!spec.startsWith("./") && !spec.startsWith("../")) continue

		const originalDir = path.dirname(originalFilePath)
		const absolutePath = path.resolve(originalDir, spec).replace(/\\/g, "/")
		const relRoot = path.relative(rootDir, absolutePath).replace(/\\/g, "/")
		const newSpec = `${relRoot}`
		updates.push({ node: st, newSpec })
	}

	if (updates.length === 0) return code

	const statements: ts.Statement[] = []
	for (const st of sf.statements) {
		if (ts.isImportDeclaration(st)) {
			const upd = updates.find((u) => u.node === st)
			if (upd) {
				statements.push(
					ts.factory.updateImportDeclaration(
						st,
						st.modifiers,
						st.importClause,
						ts.factory.createStringLiteral(upd.newSpec),
						st.attributes,
					),
				)
				continue
			}
		}
		statements.push(st)
	}

	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
	const nextFile = ts.factory.updateSourceFile(sf, statements)
	return printer.printFile(nextFile)
}

// =============================================================================
// Vanilla-extract plugin integration
// =============================================================================

function handleVanillaExtractError(
	err: Error,
	reject: (reason: Error) => void,
): void {
	const rawMsg = err?.message || String(err)
	const stack = err?.stack || ""

	if (rawMsg.includes("Styles were unable to be assigned to a file")) {
		const offenderMatch =
			stack.match(/\(([^)]+\.(?:ts|tsx))\)/) ||
			stack.match(/at\s+.*?\s+\(([^)]+\.(?:ts|tsx))\)/) ||
			stack.match(/\s(\/[^\s]+\.(?:ts|tsx))/)

		const offender = offenderMatch?.[1] ?? "Unable to determine offending file!"
		const offenderName = offender.split("/").pop() ?? offender

		const message = [
			"Styles were unable to be assigned to a file. You likely created styles outside of a '.css.ts' context",
			"",
			"Places you're allowed to define styles:",
			"- You may define styles in the same file they're used in",
			"- You may define styles in a '.css.ts' file",
			"",
			"Potential ways to fix:",
			`- Rename '${offenderName}' to '${offenderName.replace(".ts", ".css.ts")}'`,
			"- Move the styles to a '.css.ts' file",
			"- Move the styles to the file they're used in",
			"- Ask Robbie for guidance",
			"",
			`Offending file: ${offender}`,
		].join("\n")

		reject(new Error(message))
		return
	}

	console.error(err)
	console.warn(
		"Encountered an error processing styles. The error message may or may not be helpful, talk to Robbie if you're stuck.",
	)
	reject(err)
}

async function runVePluginOnTempFile(
	originalThis: TurboLoaderContext<TurboLoaderOptions>,
	tempFilePath: string,
	loaderOptions: Partial<TurboLoaderOptions>,
): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const modifiedThis = {
			getOptions: () => ({
				identifiers: process.env.NODE_ENV === "production" ? "short" : "debug",
				outputCss: null,
				nextEnv: loaderOptions?.nextEnv ?? null,
			}),
			getResolve: originalThis.getResolve,
			rootContext: originalThis.rootContext,
			resourcePath: tempFilePath,
			fs: originalThis.fs,
		} satisfies TurboLoaderContext<TurboLoaderOptions>

		Promise.resolve(turboLoader.call(modifiedThis))
			.then(resolve)
			.catch((err: Error) => handleVanillaExtractError(err, reject))
	})
}

// =============================================================================
// Main transform
// =============================================================================

async function transform(
	loaderThis: TurboLoaderContext<TurboLoaderOptions>,
	rootContext: string,
	filePath: string,
	sourceCode: string,
	options: Partial<TurboLoaderOptions>,
): Promise<{ code: string; movedNames: string[] }> {
	const isTsx = filePath.endsWith(".tsx") || filePath.endsWith(".jsx")

	// 1) Build dependency graph
	const graph = analyzeDependencies(sourceCode, { isTsx })

	// 2) Build tracked import registry
	const registry = buildTrackedRegistry(graph)

	// 3) Compute tainted nodes
	const { tainted, invalidTainted } = computeTaintedNodes(graph, registry)

	// 4) Error on tainted functions/classes (skip for library/styled files which are part of the system)
	const isStyledLibrary = filePath.includes("library/styled/")
	if (invalidTainted.length > 0 && !isStyledLibrary) {
		const names = invalidTainted.map((n) => n.name ?? "anonymous").join(", ")
		throw new Error(
			`Cannot use style functions inside function/class body: ${names}. ` +
				`Move style calls to module scope or a .css.ts file.`,
		)
	}

	// 5) Early exit if nothing tainted
	if (tainted.size === 0) {
		return { code: sourceCode, movedNames: [] }
	}

	// 6) Analyze styled() calls
	const styledTransforms = analyzeStyledCalls(graph, registry, tainted)

	// 7) Partition nodes
	const partition = partitionNodes(graph, tainted, styledTransforms)

	// 8) Build virtual module source
	const virtualSource = buildVirtualSource(
		graph,
		partition,
		tainted,
		styledTransforms,
	)

	// 9) Rewrite imports to tsconfig-safe specifiers
	const virtualSourceResolved = rewriteToTsconfig(
		virtualSource,
		filePath,
		rootContext,
	)

	// Paths for debug and temp files
	const relPath = path.relative(rootContext, filePath).replace(/\\/g, "/")
	const relPathNoExt = relPath.replace(/\.(?:tsx|ts|jsx|js)$/i, "")
	const virtualExt = isTsx ? ".css.tsx" : ".css.ts"

	// Write pre-process debug file
	const preProcessDebugPath = path.join(
		rootContext,
		".next",
		"debug",
		"pre-process",
		`${relPathNoExt}${virtualExt}`,
	)
	await fs.mkdir(path.dirname(preProcessDebugPath), { recursive: true })
	await fs.writeFile(preProcessDebugPath, virtualSourceResolved)

	// 10) Write temp file
	const tmpRoot = path.join(rootContext, ".next", "vanilla")
	const tmpFile = path
		.join(tmpRoot, `${relPathNoExt}${virtualExt}`)
		.replace(/\\/g, "/")
	fsSync.mkdirSync(path.dirname(tmpFile), { recursive: true })
	fsSync.writeFileSync(tmpFile, virtualSourceResolved, "utf8")

	// 11) Run VE plugin
	const veJs = await runVePluginOnTempFile(loaderThis, tmpFile, options)
	const veJsResolved = rewriteToTsconfig(veJs, tmpFile, rootContext)

	// 12) Embed as data URL and build original module
	const jsBase64 = Buffer.from(veJsResolved, "utf8").toString("base64")
	const importPath = `data:text/javascript;base64,${jsBase64}`

	const newStatements = buildOriginalStatements(
		graph,
		partition,
		tainted,
		styledTransforms,
		importPath,
	)

	// 13) Print final transformed source
	const updated = ts.factory.updateSourceFile(graph.sourceFile, newStatements)
	const printed = printSourceFile(updated)

	// Write final debug file
	const finalDebugPath = path.join(
		rootContext,
		".next",
		"debug",
		"final",
		relPath,
	)
	await fs.mkdir(path.dirname(finalDebugPath), { recursive: true })
	await fs.writeFile(finalDebugPath, printed)

	return {
		code: printed,
		movedNames: partition.imports,
	}
}

// =============================================================================
// Loader entry point
// =============================================================================

export default async function vanillaSplitLoader(
	this: TurboLoaderContext<TurboLoaderOptions>,
	sourceCode: string,
) {
	// Pass through pure vanilla-extract files untouched
	if (
		this.resourcePath.endsWith(".css.ts") ||
		this.resourcePath.endsWith(".css.tsx")
	) {
		return sourceCode
	}

	// Skip styled library files - they ARE the style system, not consumers of it
	if (this.resourcePath.includes("library/styled/")) {
		return sourceCode
	}

	const options = this.getOptions ? this.getOptions() : {}
	const { code } = await transform(
		this,
		this.rootContext,
		this.resourcePath,
		sourceCode,
		options,
	)

	return code
}
