#!/usr/bin/env node

/*
  Codemod: Convert old styled object-spread configs to array alpha style system using TypeScript AST

  - Converts: styled(X, { ...expr1, ...expr2, ... }) → styled(X, [ expr1, expr2, ... ])
  - Skips function-based styles: styled(X, () => ({ ... })) and annotates with a TODO above
  - Partial conversion supported; only converted files get imports updated to `library/styled/alpha`
  - Normalizes fresponsive(…) → f.responsive(…) within converted arrays
  - Preserves file formatting by performing targeted range edits, not full reprints
*/

import fs from "node:fs/promises"
import path from "node:path"
import { globby } from "globby"
import ts from "typescript"

const args = process.argv.slice(2)
const dryRun = args.includes("--dry") || args.includes("-n")
const verbose = args.includes("--verbose") || args.includes("-v")
const patterns = args.filter((a) => !a.startsWith("-"))
const defaultPatterns = ["app/**/*.{ts,tsx}", "sanity/**/*.{ts,tsx}"]

function log(...m) {
	if (verbose) console.log(...m)
}

function isStyledCall(node) {
	return (
		ts.isCallExpression(node) &&
		ts.isIdentifier(node.expression) &&
		node.expression.text === "styled"
	)
}

function getLineStartAtPos(text, pos) {
	const nl = text.lastIndexOf("\n", Math.max(0, pos - 1))
	return nl === -1 ? 0 : nl + 1
}

function getIndentAt(text, pos) {
	const lineStart = getLineStartAtPos(text, pos)
	let i = lineStart
	while (i < text.length && (text[i] === " " || text[i] === "\t")) i++
	return text.slice(lineStart, i)
}

function hasAlphaTodoAbove(text, pos) {
	const lineStart = getLineStartAtPos(text, pos)
	const prevLineStart = getLineStartAtPos(text, Math.max(0, lineStart - 1))
	const prevLine = text.slice(prevLineStart, lineStart)
	return prevLine.includes("TODO(alpha-style-migration)")
}

function normalizeFResponsive(s) {
	return s.replace(/\bfresponsive\s*\(/g, "f.responsive(")
}

function applyEdits(text, edits) {
	const sorted = [...edits].sort((a, b) => b.start - a.start)
	let out = text
	for (const e of sorted) {
		out = out.slice(0, e.start) + e.text + out.slice(e.end)
	}
	return out
}

function transformFile(sourceText, fileName) {
	const sf = ts.createSourceFile(
		fileName,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	)

	const edits = []
	let converted = 0
	let skipped = 0
	const styledCalls = []

	function visit(node) {
		if (isStyledCall(node)) styledCalls.push(node)
		ts.forEachChild(node, visit)
	}
	visit(sf)

	for (const call of styledCalls) {
		const args = call.arguments
		if (args.length < 2) continue
		const second = args[1]

		// skip and annotate function-based styles
		if (ts.isArrowFunction(second) || ts.isFunctionExpression(second)) {
			const insertPos = getLineStartAtPos(sourceText, call.getStart(sf))
			if (!hasAlphaTodoAbove(sourceText, call.getStart(sf))) {
				const indent = getIndentAt(sourceText, insertPos)
				edits.push({
					start: insertPos,
					end: insertPos,
					text: `${indent}// TODO(alpha-style-migration): function-based styled; manual conversion required\n`,
				})
			}
			skipped++
			continue
		}

		// only convert object literals of pure spreads
		if (!ts.isObjectLiteralExpression(second)) continue
		if (second.properties.length === 0) continue
		if (!second.properties.every((p) => ts.isSpreadAssignment(p))) continue

		const objStart = second.getStart(sf) // '{'
		const objEnd = second.getEnd() // '}'
		const innerStart = objStart + 1
		const innerEnd = objEnd - 1

		// remove leading "..." from each spread using offsets
		const spreadRemovals = second.properties
			.filter((p) => ts.isSpreadAssignment(p))
			.map((p) => {
				const spreadStart = p.getStart(sf) // points at '...'
				return { start: spreadStart, end: spreadStart + 3 }
			})
			.sort((a, b) => b.start - a.start)

		let innerText = sourceText.slice(innerStart, innerEnd)
		for (const r of spreadRemovals.map((r) => ({
			start: r.start - innerStart,
			end: r.end - innerStart,
		}))) {
			innerText = innerText.slice(0, r.start) + innerText.slice(r.end)
		}
		innerText = normalizeFResponsive(innerText)

		edits.push({ start: objStart, end: objEnd, text: `[${innerText}]` })
		converted++
	}

	// if any conversion happened in this file, rewrite imports/exports to alpha
	if (converted > 0) {
		for (const stmt of sf.statements) {
			if (
				(ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt)) &&
				stmt.moduleSpecifier &&
				ts.isStringLiteral(stmt.moduleSpecifier)
			) {
				const lit = stmt.moduleSpecifier
				if (lit.text === "library/styled") {
					const start = lit.getStart(sf) + 1
					const end = lit.getEnd() - 1
					edits.push({ start, end, text: "library/styled/alpha" })
				}
			}
		}
	}

	if (edits.length === 0)
		return { changed: false, text: sourceText, converted, skipped }
	const newText = applyEdits(sourceText, edits)
	return { changed: true, text: newText, converted, skipped }
}

async function run() {
	const files = await globby(patterns.length ? patterns : defaultPatterns, {
		gitignore: true,
		ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
		onlyFiles: true,
		expandDirectories: false,
	})
	if (files.length === 0) {
		console.error("No files matched.")
		process.exit(1)
	}
	let changedFiles = 0
	let totalConverted = 0
	let totalSkipped = 0
	for (const file of files) {
		const abs = path.resolve(file)
		const source = await fs.readFile(abs, "utf8")
		const { changed, text, converted, skipped } = transformFile(source, abs)
		totalConverted += converted
		totalSkipped += skipped
		if (changed) {
			changedFiles++
			if (dryRun) {
				console.log(
					`[dry] would update ${file} (converted: ${converted}, skipped: ${skipped})`,
				)
			} else {
				await fs.writeFile(abs, text, "utf8")
				log(`updated ${file} (converted: ${converted}, skipped: ${skipped})`)
			}
		}
	}
	const summary = `${changedFiles} file(s) ${dryRun ? "would be" : ""} updated; ${totalConverted} converted, ${totalSkipped} skipped.`
	console.log(
		dryRun ? `Dry run complete. ${summary}` : `Codemod complete. ${summary}`,
	)
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
