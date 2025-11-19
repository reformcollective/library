import fsSync from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import turboLoaderRAW from "@vanilla-extract/turbopack-plugin"
import ts from "typescript"
import type { LoaderContext } from "webpack"

type ModulesConfig = Record<string, string[]>

type SplitOptions = {
	nextEnv?: Record<string, string> | null
}

// @ts-expect-error turbopack loader shape has default export in some builds
const turboLoader = turboLoaderRAW.default as typeof turboLoaderRAW
// tracked functions that should be extracted to virtual .css.ts modules
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
	"library/styled/alpha": ["styled", "keyframes"],
}

const SPLIT_STYLED_MODULE = "library/styled/alpha"
const SPLIT_STYLED_IMPORT = "styled"

type ImportRegistry = {
	trackedLocalNames: Set<string>
	trackedLocalToModule: Map<string, string>
	trackedLocalToImported: Map<string, string>
	allImports: ts.ImportDeclaration[]
}

type MovedDeclaration = {
	name: string
	initializerText: string
	initializer: ts.Expression
	kind: "const" | "let"
}

type MovedExpression = {
	text: string
	expression: ts.Expression
}

type SplitResult = {
	statements: ts.Statement[]
	movedNames: string[]
	reexportNames: string[]
	movedDecls: MovedDeclaration[]
	movedExprs: MovedExpression[]
	supportingStatements: ts.Statement[]
	needsWithComponentHelper: boolean
}

// =============================================================================
// TS factory helpers
// =============================================================================

const createNamedImport = (
	names: string[],
	fromPath: string,
): ts.ImportDeclaration => {
	const code = `import { ${names.join(", ")} } from ${JSON.stringify(fromPath)};`
	const sf = ts.createSourceFile(
		"i.ts",
		code,
		ts.ScriptTarget.ES2020,
		false,
		ts.ScriptKind.TS,
	)
	return sf.statements[0] as ts.ImportDeclaration
}

const createReExport = (
	names: string[],
	fromPath: string,
): ts.ExportDeclaration => {
	return ts.factory.createExportDeclaration(
		undefined,
		false,
		ts.factory.createNamedExports(
			names.map((n) => ts.factory.createExportSpecifier(false, undefined, n)),
		),
		ts.factory.createStringLiteral(fromPath),
		undefined,
	)
}

// =============================================================================
// Import registry
// =============================================================================

/**
 * Scans the source file for imports of tracked functions and builds a registry
 * mapping local names to their module/import names.
 */
const buildImportRegistry = (sourceFile: ts.SourceFile): ImportRegistry => {
	const trackedLocalNames = new Set<string>()
	const trackedLocalToModule = new Map<string, string>()
	const trackedLocalToImported = new Map<string, string>()
	const allImports: ts.ImportDeclaration[] = []

	for (const stmt of sourceFile.statements) {
		if (!ts.isImportDeclaration(stmt)) continue

		allImports.push(stmt)

		const moduleSpecifier = (stmt.moduleSpecifier as ts.StringLiteral).text
		const tracked = TRACKED_MODULES[moduleSpecifier]

		if (!tracked || !stmt.importClause) continue

		const { name: defaultImport, namedBindings } = stmt.importClause

		// track default import if explicitly included
		if (defaultImport && tracked.includes("default")) {
			trackedLocalNames.add(defaultImport.text)
			trackedLocalToModule.set(defaultImport.text, moduleSpecifier)
			trackedLocalToImported.set(defaultImport.text, "default")
		}

		// track named imports
		if (namedBindings && ts.isNamedImports(namedBindings)) {
			for (const el of namedBindings.elements) {
				const imported = (el.propertyName ?? el.name).text
				const local = el.name.text
				if (tracked.includes(imported)) {
					trackedLocalNames.add(local)
					trackedLocalToModule.set(local, moduleSpecifier)
					trackedLocalToImported.set(local, imported)
				}
			}
		}
	}

	return {
		trackedLocalNames,
		trackedLocalToModule,
		trackedLocalToImported,
		allImports,
	}
}

// =============================================================================
// Styled component handling
// =============================================================================

/**
 * Handles styled(Component, config) by splitting it into:
 * - Virtual module: Component___raw = styled('div', config)
 * - Original file: Component = withComponent(FirstArg, Component___raw)
 */
const handleStyledComponent = (
	decl: ts.VariableDeclaration,
	call: ts.CallExpression,
	sourceFile: ts.SourceFile,
	isConstList: boolean,
): {
	shouldMove: boolean
	movedName?: string
	movedInitializer?: string
	kind?: "const" | "let"
	newDecl?: ts.VariableDeclaration
} => {
	const args = call.arguments
	const firstArg = args[0]
	const baseName = (decl.name as ts.Identifier).text

	// styled('tag', ...) -> move entirely to virtual module
	const isStringTag =
		firstArg &&
		(ts.isStringLiteral(firstArg) ||
			ts.isNoSubstitutionTemplateLiteral(firstArg))

	if (isStringTag) {
		// styled('tag', ...rest) -> include debugId as third arg when rest exists
		const firstArgText = firstArg.getText(sourceFile)
		const restArgs = args.slice(1)
		const restArgsText = restArgs.map((a) => a.getText(sourceFile)).join(", ")
		const movedInitializer =
			restArgs.length > 0
				? `styled(${firstArgText}, ${restArgsText}, ${JSON.stringify(baseName)})`
				: `styled(${firstArgText})`

		return {
			shouldMove: true,
			movedName: baseName,
			movedInitializer,
			kind: isConstList ? "const" : "let",
		}
	}

	// styled(Component, ...) -> split into raw + wrapper
	const rawName = `${baseName}___raw`
	const restArgs = args.slice(1)

	// build: styled('div', ...restArgs)
	const restArgsText = restArgs.map((a) => a.getText(sourceFile)).join(", ")
	const rawInitializer = restArgsText
		? `styled("div", ${restArgsText}, ${JSON.stringify(baseName)})`
		: `styled("div")`

	// build: withComponent(FirstArg, rawName)
	const newInit = ts.factory.createCallExpression(
		ts.factory.createIdentifier("withComponent"),
		undefined,
		[
			firstArg ?? ts.factory.createIdentifier("undefined"),
			ts.factory.createIdentifier(rawName),
		],
	)

	const newDecl = ts.factory.updateVariableDeclaration(
		decl,
		decl.name,
		decl.exclamationToken,
		decl.type,
		newInit,
	)

	return {
		shouldMove: true,
		movedName: rawName,
		movedInitializer: rawInitializer,
		kind: isConstList ? "const" : "let",
		newDecl,
	}
}

// =============================================================================
// Statement splitting
// =============================================================================

/**
 * Walks all statements in the source file and splits out tracked function calls
 * into declarations/expressions to be moved to the virtual module.
 */
const splitDeclarations = (
	sourceFile: ts.SourceFile,
	registry: ImportRegistry,
): SplitResult => {
	const statements: ts.Statement[] = []
	const movedNames: string[] = []
	const reexportNames: string[] = []
	const movedDecls: MovedDeclaration[] = []
	const movedExprs: MovedExpression[] = []
	let needsWithComponentHelper = false

	for (const stmt of sourceFile.statements) {
		// handle top-level expression statements (e.g., globalStyle(...))
		if (ts.isExpressionStatement(stmt)) {
			const expr = stmt.expression
			// handle both call expressions and tagged template expressions
			let ident: ts.Identifier | undefined
			if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
				ident = expr.expression
			} else if (
				ts.isTaggedTemplateExpression(expr) &&
				ts.isIdentifier(expr.tag)
			) {
				ident = expr.tag
			}
			if (ident && registry.trackedLocalNames.has(ident.text)) {
				movedExprs.push({
					text: expr.getText(sourceFile),
					expression: expr,
				})
				continue
			}
			statements.push(stmt)
			continue
		}

		// only interested in variable statements from here
		if (!ts.isVariableStatement(stmt)) {
			statements.push(stmt)
			continue
		}

		const isExported = (stmt.modifiers ?? []).some(
			(m) => m.kind === ts.SyntaxKind.ExportKeyword,
		)
		const isConstList = (stmt.declarationList.flags & ts.NodeFlags.Const) !== 0
		const keptDecls: ts.VariableDeclaration[] = []

		for (const decl of stmt.declarationList.declarations) {
			// skip non-identifier or uninitialized declarations
			if (!ts.isIdentifier(decl.name) || !decl.initializer) {
				keptDecls.push(decl)
				continue
			}

			// check if initializer is a tracked function call
			let trackedIdent: ts.Identifier | undefined
			if (
				ts.isCallExpression(decl.initializer) &&
				ts.isIdentifier(decl.initializer.expression)
			) {
				trackedIdent = decl.initializer.expression
			} else if (
				ts.isTaggedTemplateExpression(decl.initializer) &&
				ts.isIdentifier(decl.initializer.tag)
			) {
				trackedIdent = decl.initializer.tag
			}
			if (!trackedIdent || !registry.trackedLocalNames.has(trackedIdent.text)) {
				keptDecls.push(decl)
				continue
			}

			const calleeLocal = trackedIdent.text
			const calleeModule = registry.trackedLocalToModule.get(calleeLocal)
			const calleeImported = registry.trackedLocalToImported.get(calleeLocal)

			const isStyledFromLib =
				calleeModule === SPLIT_STYLED_MODULE &&
				calleeImported === SPLIT_STYLED_IMPORT
			const callExpr = ts.isCallExpression(decl.initializer)
				? decl.initializer
				: undefined

			if (isStyledFromLib && callExpr) {
				const result = handleStyledComponent(
					decl,
					callExpr,
					sourceFile,
					isConstList,
				)
				if (
					result.shouldMove &&
					result.movedName &&
					result.movedInitializer &&
					result.kind
				) {
					movedNames.push(result.movedName)
					movedDecls.push({
						name: result.movedName,
						initializerText: result.movedInitializer,
						initializer: callExpr,
						kind: result.kind,
					})
					if (result.newDecl) {
						keptDecls.push(result.newDecl)
						needsWithComponentHelper = true
					} else if (isExported) {
						// styled('tag') was moved entirely, re-export it
						reexportNames.push(decl.name.text)
					}
				}
				continue
			}

			// non-styled tracked calls (style, keyframes, etc.) -> move to virtual module
			movedNames.push(decl.name.text)
			if (isExported) reexportNames.push(decl.name.text)
			movedDecls.push({
				name: decl.name.text,
				initializerText: decl.initializer.getText(sourceFile),
				initializer: decl.initializer,
				kind: isConstList ? "const" : "let",
			})
		}

		// if any declarations remain, keep the statement
		if (keptDecls.length > 0) {
			statements.push(
				ts.factory.updateVariableStatement(
					stmt,
					stmt.modifiers,
					ts.factory.updateVariableDeclarationList(
						stmt.declarationList,
						keptDecls,
					),
				),
			)
		}
	}

	return {
		statements,
		movedNames,
		reexportNames,
		movedDecls,
		movedExprs,
		supportingStatements: [],
		needsWithComponentHelper,
	}
}

// =============================================================================
// Dependency analysis helpers
// =============================================================================

const GLOBAL_IDENTIFIERS = new Set<string>([
	"Math",
	"Number",
	"String",
	"Boolean",
	"Object",
	"Array",
	"Set",
	"Map",
	"WeakMap",
	"WeakSet",
	"Date",
	"BigInt",
	"Symbol",
	"Promise",
	"RegExp",
	"Intl",
	"JSON",
	"Reflect",
	"Proxy",
	"console",
	"window",
	"document",
	"navigator",
	"location",
	"globalThis",
	"self",
])

const extractBindingNames = (
	binding: ts.BindingName,
	names: string[],
): void => {
	if (ts.isIdentifier(binding)) {
		names.push(binding.text)
		return
	}

	for (const element of binding.elements) {
		if (ts.isOmittedExpression(element)) continue
		extractBindingNames(element.name, names)
	}
}

const collectLocalNames = (
	node: ts.Node | undefined,
	locals: Set<string>,
): void => {
	if (!node) return

	const visit = (current: ts.Node) => {
		if (ts.isFunctionLike(current)) {
			if (current.name && ts.isIdentifier(current.name)) {
				locals.add(current.name.text)
			}
			for (const param of current.parameters) {
				const paramNames: string[] = []
				extractBindingNames(param.name, paramNames)
				paramNames.forEach((name) => {
					locals.add(name)
				})
			}
		}

		if (ts.isVariableDeclaration(current)) {
			const declNames: string[] = []
			extractBindingNames(current.name, declNames)
			declNames.forEach((name) => {
				locals.add(name)
			})
		}

		if (ts.isCatchClause(current) && current.variableDeclaration) {
			const catchNames: string[] = []
			extractBindingNames(current.variableDeclaration.name, catchNames)
			catchNames.forEach((name) => {
				locals.add(name)
			})
		}

		current.forEachChild(visit)
	}

	visit(node)
}

const isIdentifierInTypePosition = (identifier: ts.Identifier): boolean => {
	let current: ts.Node | undefined = identifier
	while (current) {
		switch (current.kind) {
			case ts.SyntaxKind.TypeReference:
			case ts.SyntaxKind.TypeAliasDeclaration:
			case ts.SyntaxKind.InterfaceDeclaration:
			case ts.SyntaxKind.TypeLiteral:
			case ts.SyntaxKind.MappedType:
			case ts.SyntaxKind.TypePredicate:
			case ts.SyntaxKind.TypeQuery:
			case ts.SyntaxKind.TypeParameter:
			case ts.SyntaxKind.ImportType:
			case ts.SyntaxKind.ExpressionWithTypeArguments:
				return true
		}

		if (ts.isImportClause(current) && current.isTypeOnly) return true
		if (ts.isImportSpecifier(current) && current.isTypeOnly) return true

		current = current.parent
	}
	return false
}

const shouldIncludeIdentifier = (identifier: ts.Identifier): boolean => {
	const text = identifier.text
	if (!text) return false
	if (text === "undefined" || text === "NaN" || text === "Infinity")
		return false

	const parent = identifier.parent
	if (!parent) return true

	if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) {
		return false
	}

	if (
		ts.isPropertyAssignment(parent) &&
		parent.name === identifier &&
		!ts.isComputedPropertyName(parent.name)
	) {
		return false
	}

	if (ts.isBindingElement(parent) && parent.name === identifier) {
		return false
	}

	if (ts.isImportSpecifier(parent) && parent.name === identifier) {
		return false
	}

	if (isIdentifierInTypePosition(identifier)) return false

	return true
}

const collectDependenciesForNode = (node: ts.Node | undefined): Set<string> => {
	const deps = new Set<string>()
	if (!node) return deps

	const locals = new Set<string>()
	collectLocalNames(node, locals)

	const visit = (current: ts.Node) => {
		if (ts.isIdentifier(current)) {
			if (!locals.has(current.text) && shouldIncludeIdentifier(current)) {
				deps.add(current.text)
			}
			return
		}

		current.forEachChild(visit)
	}

	visit(node)
	return deps
}

const _collectDependenciesFromSplitResult = (
	result: SplitResult,
): Set<string> => {
	const deps = new Set<string>()
	for (const md of result.movedDecls) {
		for (const dep of collectDependenciesForNode(md.initializer)) {
			deps.add(dep)
		}
	}
	for (const expr of result.movedExprs) {
		for (const dep of collectDependenciesForNode(expr.expression)) {
			deps.add(dep)
		}
	}
	return deps
}

const collectImportLocalNames = (
	imports: ts.ImportDeclaration[],
): Set<string> => {
	const names = new Set<string>()
	for (const decl of imports) {
		const clause = decl.importClause
		if (!clause) continue
		if (clause.name) {
			names.add(clause.name.text)
		}
		if (clause.namedBindings) {
			if (ts.isNamespaceImport(clause.namedBindings)) {
				names.add(clause.namedBindings.name.text)
			} else if (ts.isNamedImports(clause.namedBindings)) {
				for (const element of clause.namedBindings.elements) {
					names.add(element.name.text)
				}
			}
		}
	}
	return names
}

const getDeclaredNamesFromStatement = (stmt: ts.Statement): string[] => {
	const names: string[] = []
	if (ts.isVariableStatement(stmt)) {
		for (const decl of stmt.declarationList.declarations) {
			extractBindingNames(decl.name, names)
		}
	} else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
		names.push(stmt.name.text)
	} else if (ts.isClassDeclaration(stmt) && stmt.name) {
		names.push(stmt.name.text)
	} else if (ts.isEnumDeclaration(stmt)) {
		names.push(stmt.name.text)
	}
	return names
}

const findSupportingStatements = (
	sourceFile: ts.SourceFile,
	unresolvedNames: Set<string>,
): ts.Statement[] => {
	const supporting: ts.Statement[] = []
	if (unresolvedNames.size === 0) return supporting

	for (const stmt of sourceFile.statements) {
		if (unresolvedNames.size === 0) break
		const declared = getDeclaredNamesFromStatement(stmt)
		if (declared.length === 0) continue
		const matches = declared.filter((name) => unresolvedNames.has(name))
		if (matches.length === 0) continue
		supporting.push(stmt)
		matches.forEach((name) => {
			unresolvedNames.delete(name)
		})
	}

	return supporting
}

const isTrackedStyledCall = (
	stmt: ts.Statement,
	registry: ImportRegistry,
): boolean => {
	if (!ts.isVariableStatement(stmt)) return false
	for (const decl of stmt.declarationList.declarations) {
		if (!decl.initializer) continue
		if (
			ts.isCallExpression(decl.initializer) &&
			ts.isIdentifier(decl.initializer.expression) &&
			registry.trackedLocalNames.has(decl.initializer.expression.text) &&
			registry.trackedLocalToModule.get(decl.initializer.expression.text) ===
				SPLIT_STYLED_MODULE &&
			registry.trackedLocalToImported.get(decl.initializer.expression.text) ===
				SPLIT_STYLED_IMPORT
		) {
			return true
		}
	}
	return false
}

const containsJsx = (node: ts.Node): boolean => {
	let found = false
	const visit = (n: ts.Node) => {
		if (
			ts.isJsxElement(n) ||
			ts.isJsxSelfClosingElement(n) ||
			ts.isJsxFragment(n)
		) {
			found = true
			return
		}
		n.forEachChild(visit)
	}
	visit(node)
	return found
}

// =============================================================================
// Virtual module construction
// =============================================================================

/**
 * Helper to parse a code snippet and find dependencies.
 * Wraps the text in a variable declaration to ensure it parses as valid TS.
 */
const getDependenciesFromText = (text: string): Set<string> => {
	const sf = ts.createSourceFile(
		"temp.ts",
		`const __TEMP__ = ${text}`,
		ts.ScriptTarget.ES2020,
		true,
		ts.ScriptKind.TS,
	)
	return collectDependenciesForNode(sf)
}

/**
 * Builds the source code for the virtual .css.ts module by combining imports,
 * moved declarations, and moved expressions.
 * Only includes imports that are actually used in the moved code.
 */
const buildVirtualModuleSource = (
	sourceFile: ts.SourceFile,
	imports: ts.ImportDeclaration[],
	movedDecls: MovedDeclaration[],
	movedExprs: MovedExpression[],
	supportingStatements: ts.Statement[],
): string => {
	const parts: string[] = []

	// Collect all identifiers used in the moved code
	const usedIdentifiers = new Set<string>()

	for (const stmt of supportingStatements) {
		collectDependenciesForNode(stmt).forEach((d) => {
			usedIdentifiers.add(d)
		})
	}
	for (const md of movedDecls) {
		// We must parse initializerText because it might be transformed (e.g. styled replacement)
		// and different from the original AST node
		getDependenciesFromText(md.initializerText).forEach((d) => {
			usedIdentifiers.add(d)
		})
	}
	for (const ex of movedExprs) {
		collectDependenciesForNode(ex.expression).forEach((d) => {
			usedIdentifiers.add(d)
		})
	}

	// only include imports that are referenced in the moved code
	for (const i of imports) {
		const importText = i.getText(sourceFile)
		const importClause = i.importClause
		if (!importClause) {
			// side-effect import, include it
			parts.push(importText)
			continue
		}

		// check if any imported names are used in moved code
		let isUsed = false

		if (importClause.name) {
			// default import
			if (usedIdentifiers.has(importClause.name.text)) {
				isUsed = true
			}
		}

		if (
			importClause.namedBindings &&
			ts.isNamedImports(importClause.namedBindings)
		) {
			// named imports
			for (const el of importClause.namedBindings.elements) {
				const localName = el.name.text
				if (usedIdentifiers.has(localName)) {
					isUsed = true
					break
				}
			}
		}

		if (isUsed) {
			parts.push(importText)
		}
	}

	// ensure supporting statements are emitted in original source order
	const units: Array<{ pos: number; text: string }> = []
	for (const stmtNode of supportingStatements) {
		let text = stmtNode.getText(sourceFile)
		// avoid exporting functions/values from .css.ts that vanilla-extract can't serialize
		if (/^\s*export\s+/.test(text)) {
			text = text.replace(/^\s*export\s+/, "")
		}
		units.push({
			pos: stmtNode.getStart(sourceFile),
			text,
		})
	}
	for (const md of movedDecls) {
		units.push({
			pos: md.initializer.getStart(),
			text: `export ${md.kind} ${md.name} = ${md.initializerText};`,
		})
	}
	for (const ex of movedExprs) {
		const text = ex.text.endsWith(";") ? ex.text : `${ex.text};`
		units.push({
			pos: ex.expression.getStart(),
			text,
		})
	}
	units.sort((a, b) => a.pos - b.pos)
	for (const u of units) {
		parts.push(u.text)
	}

	return `${parts.join("\n")}\n`
}

// =============================================================================
// Import injection
// =============================================================================

/**
 * Injects the virtual module import and re-exports into the transformed statements.
 * Also injects withComponent helper import if needed.
 */
const injectImports = (
	statements: ts.Statement[],
	movedNames: string[],
	reexportNames: string[],
	importPath: string,
	needsWithComponentHelper: boolean,
): ts.Statement[] => {
	const importDecl = createNamedImport(movedNames, importPath)

	// find last import to insert after it
	let lastImportIndex = -1
	statements.forEach((st, i) => {
		if (ts.isImportDeclaration(st)) lastImportIndex = i
	})

	const insertAt = lastImportIndex >= 0 ? lastImportIndex + 1 : 0
	const newStatements = [...statements]

	// inject withComponent helper if needed
	if (needsWithComponentHelper) {
		const helperImport = createNamedImport(
			["withComponent"],
			"library/styled/withComponent",
		)
		newStatements.splice(insertAt, 0, helperImport)
	}

	// inject virtual module import
	const virtualImportAt = needsWithComponentHelper ? insertAt + 1 : insertAt
	newStatements.splice(virtualImportAt, 0, importDecl)

	// inject re-exports if needed
	if (reexportNames.length > 0) {
		const reexp = createReExport(reexportNames, importPath)
		newStatements.splice(virtualImportAt + 1, 0, reexp)
	}

	return newStatements
}

// =============================================================================
// Vanilla-extract plugin integration
// =============================================================================

const handleVanillaExtractError = (
	err: Error,
	reject: (reason: Error) => void,
): void => {
	const rawMsg = (err && (err as Error).message) || String(err)
	const stack = (err && (err as Error).stack) || ""
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

	// eslint-disable-next-line no-console
	console.error(err)
	// eslint-disable-next-line no-console
	console.warn(
		"Encountered an error processing styles. The error message may or may not be helpful, talk to Robbie if you're stuck.",
	)
	reject(err)
}

const runVePluginOnTempFile = async (
	originalThis: LoaderContext<unknown>,
	tempFilePath: string,
	originalFilePath: string,
	loaderOptions: SplitOptions,
): Promise<string> => {
	return new Promise<string>((resolve, reject) => {
		const mode = originalThis.mode ?? "development"
		const rootContext = originalThis.rootContext
		const originalDir = path.dirname(originalFilePath)

		// wrap getResolve to always resolve from original file's directory
		const getResolveWrapped = (options?: unknown) => {
			// @ts-expect-error webpack types
			const realGetResolve = originalThis.getResolve?.(options)
			if (!realGetResolve) return undefined
			return (
				_context: string,
				request: string,
				cb: (err: Error | null, result?: string) => void,
			) => {
				realGetResolve(
					originalDir,
					request,
					(err: Error | null, res?: string | false) =>
						cb(err, (typeof res === "string" ? res : undefined) ?? undefined),
				)
			}
		}

		let captured: string | undefined
		const modifiedThis = {
			async: () => (err?: Error | null, content?: string) => {
				if (err) {
					handleVanillaExtractError(err, reject)
					return
				}
				captured = content ?? ""
				resolve(captured)
			},
			getOptions: () => ({
				identifiers: process.env.NODE_ENV === "production" ? "short" : "debug",
				outputCss: null,
				nextEnv: loaderOptions?.nextEnv ?? null,
			}),
			getResolve: getResolveWrapped,
			addDependency: (_file: string) => {},
			mode,
			rootContext,
			resourcePath: tempFilePath,
			resourceQuery: "",
		}

		Promise.resolve(
			// @ts-expect-error loader callable
			turboLoader.call(modifiedThis),
		)
			.then(() => {
				if (captured === undefined) resolve("")
			})
			.catch(reject)
	})
}

// =============================================================================
// Main transform
// =============================================================================

const transform = async (
	loaderThis: LoaderContext<unknown>,
	rootContext: string,
	filePath: string,
	sourceCode: string,
	options: SplitOptions,
): Promise<{ code: string; movedNames: string[] }> => {
	const isTsx = filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
	const sourceFile = ts.createSourceFile(
		filePath,
		sourceCode,
		ts.ScriptTarget.ES2020,
		true,
		isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	)

	// 1) build import registry
	const registry = buildImportRegistry(sourceFile)

	// 2) split declarations
	const splitResult = splitDeclarations(sourceFile, registry)

	// nothing to move? return original code unchanged
	if (splitResult.movedNames.length === 0) {
		return { code: sourceCode, movedNames: [] }
	}

	// 2.5) iteratively include supporting statements (and their own deps)
	const importLocalNames = collectImportLocalNames(registry.allImports)
	const movedNamesSet = new Set(splitResult.movedNames)
	const includedSupport = new Set<ts.Statement>()
	const declaredBySupport = new Set<string>()

	const computeUnresolved = (): Set<string> => {
		const deps = new Set<string>()
		for (const md of splitResult.movedDecls) {
			for (const dep of collectDependenciesForNode(md.initializer))
				deps.add(dep)
		}
		for (const ex of splitResult.movedExprs) {
			for (const dep of collectDependenciesForNode(ex.expression)) deps.add(dep)
		}
		for (const st of splitResult.supportingStatements) {
			for (const dep of collectDependenciesForNode(st)) deps.add(dep)
		}
		const unresolved = new Set<string>()
		for (const name of deps) {
			if (movedNamesSet.has(name)) continue
			if (importLocalNames.has(name)) continue
			if (GLOBAL_IDENTIFIERS.has(name)) continue
			if (declaredBySupport.has(name)) continue
			unresolved.add(name)
		}
		return unresolved
	}

	let unresolvedNames = computeUnresolved()
	// Increased limit to 50 to handle deep dependency chains.
	// The loop exits early if no new supporting statements are found.
	for (let i = 0; i < 50 && unresolvedNames.size > 0; i++) {
		const support = findSupportingStatements(
			sourceFile,
			unresolvedNames,
		).filter(
			(s) =>
				!includedSupport.has(s) &&
				!isTrackedStyledCall(s, registry) &&
				!containsJsx(s),
		)
		if (support.length === 0) break
		for (const st of support) {
			includedSupport.add(st)
			splitResult.supportingStatements.push(st)
			for (const nm of getDeclaredNamesFromStatement(st)) {
				declaredBySupport.add(nm)
			}
		}
		unresolvedNames = computeUnresolved()
	}

	// 3) build virtual module source
	const virtualSource = buildVirtualModuleSource(
		sourceFile,
		registry.allImports,
		splitResult.movedDecls,
		splitResult.movedExprs,
		splitResult.supportingStatements,
	)

	// 4) rewrite imports in virtual module to be tsconfig-safe specifiers
	const rewriteToTsconfig = (
		code: string,
		originalFilePath: string,
		rootDir: string,
	): string => {
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
			const newSpec = `@/${relRoot}`
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
							st.assertClause,
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
	const virtualSourceResolved = rewriteToTsconfig(
		virtualSource,
		filePath,
		rootContext,
	)

	// use relative path from rootContext for better class name prefixes
	// e.g., app/sections/BrandedComps/index.tsx -> sections-BrandedComps-index
	const relPath = path.relative(rootContext, filePath).replace(/\\/g, "/")
	const relPathNoExt = relPath.replace(/\.(?:tsx|ts|jsx|js)$/i, "")

	// write pre-process debug file
	const preProcessDebugPath = path.join(
		rootContext,
		".next",
		"debug",
		"pre-process",
		`${relPathNoExt}.css.ts`,
	)
	await fs.mkdir(path.dirname(preProcessDebugPath), { recursive: true })
	await fs.writeFile(preProcessDebugPath, virtualSourceResolved)

	// 5) write temp file mirroring the original relative path
	const tmpRoot = path.join(rootContext, ".next", "vanilla")
	const tmpFile = path
		.join(tmpRoot, `${relPathNoExt}.css.ts`)
		.replace(/\\/g, "/")
	fsSync.mkdirSync(path.dirname(tmpFile), { recursive: true })
	fsSync.writeFileSync(tmpFile, virtualSourceResolved, "utf8")

	// 6) run VE plugin on temp file (keep file on disk for debugging)
	let veJs = ""
	veJs = await runVePluginOnTempFile(loaderThis, tmpFile, filePath, options)

	// 7) rewrite imports in VE output to tsconfig-safe specifiers
	const veJsResolved = rewriteToTsconfig(veJs, tmpFile, rootContext)

	// 8) embed as data URL and inject imports
	const jsBase64 = Buffer.from(veJsResolved, "utf8").toString("base64")
	const importPath = `data:text/javascript;base64,${jsBase64}`
	const newStatements = injectImports(
		splitResult.statements,
		splitResult.movedNames,
		splitResult.reexportNames,
		importPath,
		splitResult.needsWithComponentHelper,
	)

	// 7) print final transformed source
	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
	const updated = ts.factory.updateSourceFile(sourceFile, newStatements)
	const printed = printer.printFile(updated)

	// write final debug file (transformed source that gets passed to loader)
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
		movedNames: splitResult.movedNames,
	}
}

// =============================================================================
// Loader entry point
// =============================================================================

export default async function vanillaSplitLoader(
	this: LoaderContext<unknown>,
	sourceCode: string,
) {
	const callback = this.async()

	try {
		// pass through pure vanilla-extract files untouched
		if (
			this.resourcePath.endsWith(".css.ts") ||
			this.resourcePath.endsWith(".css.tsx")
		) {
			return callback(null, sourceCode)
		}

		const options = this.getOptions ? (this.getOptions() as SplitOptions) : {}
		const { code } = await transform(
			this,
			this.rootContext,
			this.resourcePath,
			sourceCode,
			options,
		)
		callback(null, code)
	} catch (e) {
		callback(e as Error)
	}
}
