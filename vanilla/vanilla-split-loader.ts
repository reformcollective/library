import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import type { LoaderContext } from "webpack"
import turboLoader from "./turbopack-plugin.ts"

type ModulesConfig = Record<string, string[]>

type SplitOptions = {
	modules?: ModulesConfig
	nextEnv?: Record<string, string> | null
}

const DEFAULT_MODULES: ModulesConfig = {
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
	],
	"library/styled": ["styled"],
}

const encodeBase64Url = (text: string): string => {
	const b64 = Buffer.from(text, "utf8").toString("base64")
	return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

const decodeBase64Url = (text: string): string => {
	let base64 = text.replace(/-/g, "+").replace(/_/g, "/")
	const pad = base64.length % 4
	if (pad) base64 += "=".repeat(4 - pad)
	return Buffer.from(base64, "base64").toString("utf8")
}

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

// NOTE: avoid using deprecated AST fields like importClause.isTypeOnly and assertClause

const buildVirtualModuleSource = (
	sourceFile: ts.SourceFile,
	imports: ts.ImportDeclaration[],
	movedDecls: Array<{
		name: string
		initializerText: string
		kind: "const" | "let"
	}>,
): string => {
	const parts: string[] = []

	for (const i of imports) {
		parts.push(i.getText(sourceFile))
	}

	for (const md of movedDecls) {
		parts.push(`export ${md.kind} ${md.name} = ${md.initializerText};`)
	}

	return `${parts.join("\n")}\n`
}

/**
 * Rewrite any relative import specifiers in a virtual module to absolute file paths
 * resolved against the original file's directory using Turbopack's resolver.
 */
const rewriteRelativeImportsToAbsolute = async (
	code: string,
	originalDir: string,
	resolverFactory: LoaderContext<unknown>["getResolve"],
) => {
	if (!resolverFactory)
		throw new Error(
			"vanilla-split: getResolve is not available; cannot rewrite relative imports",
		)

	const resolver = resolverFactory({})
	if (!resolver)
		throw new Error(
			"vanilla-split: getResolve returned no resolver; cannot rewrite relative imports",
		)

	const sf = ts.createSourceFile(
		"virtual.ts",
		code,
		ts.ScriptTarget.ES2020,
		true,
		ts.ScriptKind.TS,
	)

	const updates: Array<{ node: ts.ImportDeclaration; resolved: string }> = []
	for (const st of sf.statements) {
		if (!ts.isImportDeclaration(st)) continue
		const spec = (st.moduleSpecifier as ts.StringLiteral).text
		if (!spec.startsWith("./") && !spec.startsWith("../")) continue

		const resolved: string = await new Promise((resolve, reject) => {
			// biome-ignore lint/suspicious/noExplicitAny: interop with turbopack types
			resolver(originalDir, spec, (err: any, result?: string) => {
				if (err) return reject(err)
				if (typeof result === "string")
					return resolve(result.replace(/\\/g, "/"))
				// fallback to absolute from original dir
				const abs = path.resolve(originalDir, spec).replace(/\\/g, "/")
				resolve(abs)
			})
		})

		updates.push({ node: st, resolved })
	}

	if (updates.length === 0) return code

	const statements: ts.Statement[] = []
	for (const st of sf.statements) {
		if (ts.isImportDeclaration(st)) {
			const upd = updates.find((u) => u.node === st)
			if (upd) {
				const updated = ts.factory.updateImportDeclaration(
					st,
					st.modifiers,
					st.importClause,
					ts.factory.createStringLiteral(upd.resolved),
					st.assertClause,
				)
				statements.push(updated)
				continue
			}
		}
		statements.push(st)
	}

	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
	const nextFile = ts.factory.updateSourceFile(sf, statements)
	return printer.printFile(nextFile)
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

		const getResolveWrapped = (options?: unknown) => {
			// biome-ignore lint/suspicious/noExplicitAny: webpack moment
			const realGetResolve = originalThis.getResolve?.(options as any)
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
					const rawMsg = err.message ?? String(err)
					const stack = err.stack ?? ""
					const offenderMatch =
						stack.match(/\(([^)]+\.(?:ts|tsx))\)/) ||
						stack.match(/at\s+.*?\s+\(([^)]+\.(?:ts|tsx))\)/) ||
						stack.match(/\s(\/[^\s]+\.(?:ts|tsx))/)
					const offender =
						offenderMatch?.[1] ?? "Unable to determine offending file!"
					const offenderName =
						offender.split("/").pop() ?? "Unable to determine offending file!"
					if (rawMsg.includes("Styles were unable to be assigned to a file")) {
						const message = [
							"Styles were unable to be assigned to a file. You likely created styles outside of a '.css.ts' context",
							"",
							"Places you're allowed to define styles:",
							"- You may define styles in the same file they're used in",
							"- You may define styles in a '.css.ts' file",
							"",
							"Potential ways to fix:",
							`- Rename '${offenderName}' to '${offenderName.replace(
								".ts",
								".css.ts",
							)}'`,
							"- Move the styles to a '.css.ts' file",
							"- Move the styles to the file they're used in",
							"- Ask Robbie for guidance",
							"",
							`Offending file: ${offender}`,
						].join("\n")

						return reject(new Error(message))
					}
					console.warn(
						"Encountered an error processing styles. The error message may or may not be helpful, talk to Robbie if you're stuck.",
					)
					console.warn(`Error occured in file: ${offenderName}`)
					return reject(err)
				}
				captured = content ?? ""
				resolve(captured)
			},
			getOptions: () => ({
				identifiers: null,
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

		// biome-ignore lint/suspicious/noExplicitAny: webpack moment
		Promise.resolve(turboLoader.call(modifiedThis as any))
			.then(() => {
				if (captured === undefined) resolve("")
			})
			.catch(reject)
	})
}

const rewriteCssImportToOriginalDir = (
	code: string,
	rootContext: string,
	originalDir: string,
): string => {
	const placeholder = path.join(rootContext, ".next", "vanilla.virtual.css")
	let rel = path.relative(originalDir, placeholder).replace(/\\/g, "/")
	if (!rel.startsWith(".")) rel = `./${rel}`
	const re =
		/import\s+['"]([^'"]*vanilla\.virtual\.css)\?ve-source=([^'"]+)['"];?/gm
	return code.replace(re, (_m, _p1, p2) => `import '${rel}?ve-source=${p2}';`)
}

const transform = async (
	loaderThis: LoaderContext<unknown>,
	rootContext: string,
	filePath: string,
	sourceCode: string,
	options: SplitOptions,
): Promise<{ code: string; movedNames: string[]; virtualSource?: string }> => {
	const isTsx = filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
	const sourceFile = ts.createSourceFile(
		filePath,
		sourceCode,
		ts.ScriptTarget.ES2020,
		true,
		isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	)

	const modules: ModulesConfig = {
		...DEFAULT_MODULES,
		...(options.modules ?? {}),
	}

	// 1) Build a map of tracked local identifiers based on imports
	const trackedLocalNames = new Set<string>()
	const allImports: ts.ImportDeclaration[] = []

	for (const stmt of sourceFile.statements) {
		if (!ts.isImportDeclaration(stmt)) continue
		allImports.push(stmt)
		const moduleSpecifier = (stmt.moduleSpecifier as ts.StringLiteral).text
		const tracked = modules[moduleSpecifier]
		if (!tracked || !stmt.importClause) continue
		const { name: defaultImport, namedBindings } = stmt.importClause
		// track default if explicitly included as "default"
		if (defaultImport && tracked.includes("default")) {
			trackedLocalNames.add(defaultImport.text)
		}
		if (namedBindings && ts.isNamedImports(namedBindings)) {
			for (const el of namedBindings.elements) {
				const imported = (el.propertyName ?? el.name).text
				const local = el.name.text
				if (tracked.includes(imported)) trackedLocalNames.add(local)
			}
		}
	}

	// 2) Walk statements and split declarations
	const statements: ts.Statement[] = []
	const movedNames: string[] = []
	const reexportNames: string[] = []
	const movedDeclsForVirtual: Array<{
		name: string
		initializerText: string
		kind: "const" | "let"
	}> = []

	for (const stmt of sourceFile.statements) {
		if (!ts.isVariableStatement(stmt)) {
			statements.push(stmt)
			continue
		}

		const isExported = (stmt.modifiers ?? []).some(
			(m) => m.kind === ts.SyntaxKind.ExportKeyword,
		)

		const keptDecls: ts.VariableDeclaration[] = []
		const isConstList = (stmt.declarationList.flags & ts.NodeFlags.Const) !== 0

		for (const decl of stmt.declarationList.declarations) {
			if (!ts.isIdentifier(decl.name) || !decl.initializer) {
				keptDecls.push(decl)
				continue
			}

			if (
				ts.isCallExpression(decl.initializer) &&
				ts.isIdentifier(decl.initializer.expression) &&
				trackedLocalNames.has(decl.initializer.expression.text)
			) {
				movedNames.push(decl.name.text)
				if (isExported) reexportNames.push(decl.name.text)
				movedDeclsForVirtual.push({
					name: decl.name.text,
					initializerText: decl.initializer.getText(sourceFile),
					kind: isConstList ? "const" : "let",
				})
				continue
			}

			keptDecls.push(decl)
		}

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

	if (movedNames.length === 0) {
		return { code: sourceCode, movedNames: [] }
	}

	// 3) Create import to virtual module and possible re-export
	const virtualSource = buildVirtualModuleSource(
		sourceFile,
		allImports,
		movedDeclsForVirtual,
	)

	// resolve relative imports inside the virtual module so it can be evaluated from tmp dir
	if (!loaderThis.getResolve) {
		throw new Error(
			"vanilla-split: getResolve is not available; cannot process virtual module imports",
		)
	}
	const virtualSourceResolved = await rewriteRelativeImportsToAbsolute(
		virtualSource,
		path.dirname(filePath),
		loaderThis.getResolve.bind(
			loaderThis,
		) as unknown as LoaderContext<unknown>["getResolve"],
	)

	// write a temp file for the VE plugin to process
	const tmpDir = path.join(
		rootContext,
		".next",
		"cache",
		"vanilla-split",
		"tmp",
	)
	fs.mkdirSync(tmpDir, { recursive: true })

	// use the original source filename for better debug class names, while
	// retaining uniqueness by scoping under a content-hash subdirectory.
	const tmpHash = crypto
		.createHash("md5")
		.update(virtualSourceResolved)
		.digest("hex")
	const originalBase = path
		.basename(filePath)
		.replace(/\.(?:tsx|ts|jsx|js)$/i, "")
	const tmpScopedDir = path.join(tmpDir, tmpHash)
	fs.mkdirSync(tmpScopedDir, { recursive: true })
	const tmpFile = path.join(tmpScopedDir, `${originalBase}.css.ts`)
	fs.writeFileSync(tmpFile, virtualSourceResolved)

	// run the official turbopack plugin on the temp file
	let veJs: string
	try {
		const veJsRaw = await runVePluginOnTempFile(
			loaderThis,
			tmpFile,
			filePath,
			options,
		)
		veJs = rewriteCssImportToOriginalDir(
			veJsRaw,
			rootContext,
			path.dirname(filePath),
		)
	} finally {
		try {
			fs.unlinkSync(tmpFile)
		} catch {}
		try {
			fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true })
		} catch {}
	}

	const importPath = `./${path.basename(
		filePath,
	)}?fileContent=${encodeBase64Url(veJs)}`
	const importDecl = createNamedImport(movedNames, importPath)

	let lastImportIndex = -1
	statements.forEach((st, i) => {
		if (ts.isImportDeclaration(st)) lastImportIndex = i
	})
	if (lastImportIndex >= 0)
		statements.splice(lastImportIndex + 1, 0, importDecl)
	else statements.unshift(importDecl)

	if (reexportNames.length > 0) {
		const reexp = createReExport(reexportNames, importPath)
		const insertAt = lastImportIndex >= 0 ? lastImportIndex + 2 : 1
		statements.splice(insertAt, 0, reexp)
	}

	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
	const updated = ts.factory.updateSourceFile(sourceFile, statements)
	return {
		code: printer.printFile(updated),
		movedNames,
		virtualSource,
	}
}

export default async function vanillaSplitLoader(
	this: LoaderContext<unknown>,
	sourceCode: string,
) {
	const callback = this.async()

	try {
		// serve virtual module content via query param
		const rawQuery = this.resourceQuery
		if (typeof rawQuery === "string" && rawQuery.length > 1) {
			const query = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery
			const params = new URLSearchParams(query)
			const fileContent = params.get("fileContent")
			if (fileContent != null) {
				const decoded = decodeBase64Url(fileContent)
				return callback(null, decoded)
			}
		}

		// pass through pure vanilla-extract files untouched
		if (this.resourcePath.endsWith(".css.ts")) {
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
