import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import type { LoaderContext } from "webpack"

type ModulesConfig = Record<string, string[]>

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
	"library/styled/alpha": ["styled"],
}

const SPLIT_STYLED_MODULE = "library/styled/alpha"
const SPLIT_STYLED_IMPORT = "styled"

type ImportRegistry = {
	trackedLocalNames: Set<string>
	trackedLocalToModule: Map<string, string>
	trackedLocalToImported: Map<string, string>
	allImports: ts.ImportDeclaration[]
}

type SplitResult = {
	statements: ts.Statement[]
	movedNames: string[]
	reexportNames: string[]
	movedDecls: Array<{
		name: string
		initializerText: string
		kind: "const" | "let"
	}>
	movedExprs: string[]
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
// Import rewriting
// =============================================================================

/**
 * Rewrites relative imports to be relative to the tsconfig baseUrl (app/).
 * This allows code evaluated in temp directories to resolve imports correctly,
 * and ensures vanilla-extract's output (which contains relative imports) works
 * when embedded as data URIs.
 *
 * Example: ../../../styles/fonts/typography → styles/fonts/typography
 */
const rewriteImportsToBaseUrl = (
	code: string,
	originalFilePath: string,
	baseUrl: string,
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

		// resolve relative import to absolute path
		const originalDir = path.dirname(originalFilePath)
		const absolutePath = path.resolve(originalDir, spec).replace(/\\/g, "/")

		// convert to relative from baseUrl
		const relativeToBase = path
			.relative(baseUrl, absolutePath)
			.replace(/\\/g, "/")

		// ensure it doesn't start with ../
		if (relativeToBase.startsWith("../")) {
			// if it goes outside baseUrl, keep it as absolute or leave as-is
			// this shouldn't happen in normal usage
			continue
		}

		updates.push({ node: st, newSpec: relativeToBase })
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
	const movedDecls: Array<{
		name: string
		initializerText: string
		kind: "const" | "let"
	}> = []
	const movedExprs: string[] = []
	let needsWithComponentHelper = false

	for (const stmt of sourceFile.statements) {
		// handle top-level expression statements (e.g., globalStyle(...))
		if (ts.isExpressionStatement(stmt)) {
			const expr = stmt.expression
			if (
				ts.isCallExpression(expr) &&
				ts.isIdentifier(expr.expression) &&
				registry.trackedLocalNames.has(expr.expression.text)
			) {
				movedExprs.push(expr.getText(sourceFile))
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
			if (
				!ts.isCallExpression(decl.initializer) ||
				!ts.isIdentifier(decl.initializer.expression) ||
				!registry.trackedLocalNames.has(decl.initializer.expression.text)
			) {
				keptDecls.push(decl)
				continue
			}

			const call = decl.initializer
			const calleeLocal = (call.expression as ts.Identifier).text
			const calleeModule = registry.trackedLocalToModule.get(calleeLocal)
			const calleeImported = registry.trackedLocalToImported.get(calleeLocal)

			const isStyledFromLib =
				calleeModule === SPLIT_STYLED_MODULE &&
				calleeImported === SPLIT_STYLED_IMPORT

			if (isStyledFromLib) {
				const result = handleStyledComponent(
					decl,
					call,
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
				initializerText: call.getText(sourceFile),
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
		needsWithComponentHelper,
	}
}

// =============================================================================
// Virtual module construction
// =============================================================================

/**
 * Builds the source code for the virtual .css.ts module by combining imports,
 * moved declarations, and moved expressions.
 * Only includes imports that are actually used in the moved code.
 */
const buildVirtualModuleSource = (
	sourceFile: ts.SourceFile,
	imports: ts.ImportDeclaration[],
	movedDecls: Array<{
		name: string
		initializerText: string
		kind: "const" | "let"
	}>,
	movedExprs: string[],
): string => {
	const parts: string[] = []

	// collect all text from moved code to check which imports are used
	const movedCodeText =
		movedDecls.map((md) => md.initializerText).join(" ") +
		" " +
		movedExprs.join(" ")

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
			if (movedCodeText.includes(importClause.name.text)) {
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
				if (movedCodeText.includes(localName)) {
					isUsed = true
					break
				}
			}
		}

		if (isUsed) {
			parts.push(importText)
		}
	}

	for (const md of movedDecls) {
		parts.push(`export ${md.kind} ${md.name} = ${md.initializerText};`)
	}

	for (const ex of movedExprs) {
		parts.push(ex.endsWith(";") ? ex : `${ex};`)
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
// Main transform
// =============================================================================

const transform = (
	rootContext: string,
	filePath: string,
	sourceCode: string,
): { code: string; movedNames: string[] } => {
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

	// 3) build virtual module source
	const virtualSource = buildVirtualModuleSource(
		sourceFile,
		registry.allImports,
		splitResult.movedDecls,
		splitResult.movedExprs,
	)

	// 4) rewrite imports in virtual module to be relative to baseUrl (app/)
	const baseUrl = path.join(rootContext, "app")
	const virtualSourceResolved = rewriteImportsToBaseUrl(
		virtualSource,
		filePath,
		baseUrl,
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
	fs.mkdirSync(path.dirname(preProcessDebugPath), { recursive: true })
	fs.writeFileSync(preProcessDebugPath, virtualSourceResolved)

	// 5) write temp .css.ts file - vanilla-extract will process it for us
	// preserve directory structure 1-1 in cache for simplicity
	// use library/vanilla/.cache so it's colocated with vanilla-split
	const tmpFile = path
		.join(
			rootContext,
			"app",
			"library",
			"vanilla",
			".cache",
			`${relPathNoExt}.css.ts`,
		)
		.replace(/\\/g, "/")
	fs.mkdirSync(path.dirname(tmpFile), { recursive: true })
	fs.writeFileSync(tmpFile, virtualSourceResolved)

	// 6) generate normal import path - vanilla-extract will handle processing
	// convert absolute path to relative import from original file
	const originalDir = path.dirname(filePath)
	let importPath = path.relative(originalDir, tmpFile).replace(/\\/g, "/")
	// ensure it starts with ./ or ../
	if (!importPath.startsWith(".")) {
		importPath = `./${importPath}`
	}
	// add random query param to force turbopack to re-process on HMR
	const randomId = Math.random().toString(36).substring(2, 15)
	importPath = `${importPath}?v=${randomId}`

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
	fs.mkdirSync(path.dirname(finalDebugPath), { recursive: true })
	fs.writeFileSync(finalDebugPath, printed)

	return {
		code: printed,
		movedNames: splitResult.movedNames,
	}
}

// =============================================================================
// Loader entry point
// =============================================================================

export default function vanillaSplitLoader(
	this: LoaderContext<unknown>,
	sourceCode: string,
) {
	const callback = this.async()

	try {
		// pass through pure vanilla-extract files untouched
		if (this.resourcePath.endsWith(".css.ts")) {
			return callback(null, sourceCode)
		}

		const { code } = transform(this.rootContext, this.resourcePath, sourceCode)

		callback(null, code)
	} catch (e) {
		callback(e as Error)
	}
}
