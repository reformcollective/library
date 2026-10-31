// Checks only comment lines added in the diff (against $BASE or the merge base with origin/main).
// --hook checks just the edited file, for the editor hook.
import { execFileSync } from "node:child_process"

const MAX_BLOCK = 2
const MAX_JSDOC = 6
const MAX_CHARS = 100
const CODE_FILE = /\.(m?[jt]sx?|css)$/
const ALLOWED = /^(biome-ignore|@ts-expect-error|eslint-disable|oxlint-disable|stylelint-disable|prettier-ignore|@refresh|\/ <reference|#region|#endregion)/
const REASONING = [/\bwe\b/i, /\bwe'(ll|re|ve|d)\b/i, /\bI\b/, /\blet's\b/i, /\bpreviously\b/i, /\binstead of\b/i, /\bthis ensures\b/i, /\bnote:/i, /\bin order to\b/i, /\bnow (we|it|this|the)\b/i]
const AI = [/(?<![.\w/-])claude(?![.\w/-])/i, /\banthropic\b/i, /\bAI\b/, /\bai[- ]generated\b/i, /\bchatgpt\b/i, /\bcopilot\b/i]

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })

// git diff --no-index exits 1 when the files differ, which is always the case here
function newFileDiff(path) {
	try {
		return git("diff", "-U0", "--no-index", "/dev/null", path)
	} catch (error) {
		return error.stdout ?? ""
	}
}

function outsideStrings(line, index) {
	const before = line.slice(0, index)
	return [`"`, `'`, "`"].every((quote) => before.split(quote).length % 2 === 1)
}

// Returns the comment text on a line, or null.
function commentText(line) {
	const trimmed = line.trim()
	const lead = trimmed.match(/^(\/\/+|\/\*+|\*\/|\*|\{\/\*)\s?(.*?)(\s*\*\/\}?)?$/)
	if (lead && !trimmed.startsWith("*=")) return lead[2]
	const trailing = line.search(/\s\/\/\s/)
	if (trailing !== -1 && outsideStrings(line, trailing)) return line.slice(trailing).replace(/^\s*\/\/\s?/, "")
	return null
}

function addedLines(diff) {
	const files = []
	let file = null
	let lineNo = 0
	for (const raw of diff.split("\n")) {
		if (raw.startsWith("+++ ")) {
			const path = raw.slice(4).replace(/^b\//, "")
			file = path === "/dev/null" ? null : { path, lines: [] }
			if (file) files.push(file)
			continue
		}
		const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)
		if (hunk) {
			lineNo = Number(hunk[1])
			continue
		}
		if (!file || raw.startsWith("---")) continue
		if (raw.startsWith("+")) file.lines.push({ no: lineNo++, text: raw.slice(1) })
		else if (!raw.startsWith("-")) lineNo++
	}
	return files.filter((f) => CODE_FILE.test(f.path))
}

// Only a person may disable these rules; an agent's edit never can.
const AGENT_ONLY_BANNED = /(eslint|oxlint)-disable.*(no-inline-style|no-raw-img)/

function check(files, { agent = false } = {}) {
	const problems = []
	for (const { path, lines } of files) {
		let block = []
		const flush = () => {
			if (!block.length) return
			const jsdoc = block[0].text.trim().startsWith("/**") && (process.env.CHECK_COMMENTS_LIBRARY === "1" || path.startsWith("library/"))
			const limit = jsdoc ? MAX_JSDOC : MAX_BLOCK
			const counted = block.filter((l) => !/^\s*(\/\*\*|\*\/)\s*$/.test(l.text))
			if (counted.length > limit) problems.push(`${path}:${block[0].no} comment is ${counted.length} lines; max ${limit}`)
			block = []
		}
		let previous = -1
		for (const line of lines) {
			const text = commentText(line.text)
			if (text !== null && /^(eslint|oxlint)-disable/.test(text.trim()) && !/\s--\s+\S/.test(text)) {
				problems.push(`${path}:${line.no} lint disable needs a reason after "--": "${text.trim()}"`)
			}
			if (agent && text !== null && AGENT_ONLY_BANNED.test(text)) {
				problems.push(`${path}:${line.no} agents may not disable this rule. Fix the code, or tell the developer why it cannot be fixed.`)
			}
			if (text === null || ALLOWED.test(text.trim())) {
				flush()
				previous = line.no
				continue
			}
			if (line.no !== previous + 1) flush()
			const standalone = /^\s*(\/\/|\/\*|\*|\{\/\*)/.test(line.text)
			if (standalone) block.push(line)
			else flush()
			if (text.length > MAX_CHARS) problems.push(`${path}:${line.no} comment line is ${text.length} characters; max ${MAX_CHARS}`)
			const reasoning = REASONING.find((pattern) => pattern.test(text))
			if (reasoning) problems.push(`${path}:${line.no} comment reads like reasoning or history (${reasoning.source.replace(/\\b/g, "")}): "${text.trim()}"`)
			if (AI.some((pattern) => pattern.test(text))) problems.push(`${path}:${line.no} comment mentions AI: "${text.trim()}"`)
			previous = line.no
		}
		flush()
	}
	return problems
}

const RULE = "Comments only for a non-obvious why, a browser workaround or a magic number's source: one line, two at most, never reasoning, history or what the code does (library/agent/RULES.md)."

if (process.argv.includes("--hook")) {
	let raw = ""
	for await (const chunk of process.stdin) raw += chunk
	const path = JSON.parse(raw).tool_input?.file_path
	if (!path || !CODE_FILE.test(path)) process.exit(0)
	const tracked = git("ls-files", "--", path).trim() !== ""
	const diff = tracked ? git("diff", "-U0", "HEAD", "--", path) : newFileDiff(path)
	const problems = check(addedLines(diff), { agent: true })
	if (problems.length) {
		console.error([...problems, RULE].join("\n"))
		process.exit(2)
	}
	process.exit(0)
}

const base = process.env.BASE || git("merge-base", "HEAD", "origin/main").trim()
const diff = git("diff", "-U0", base)
const untracked = git("ls-files", "--others", "--exclude-standard").split("\n").filter((p) => CODE_FILE.test(p))
const extra = untracked.map(newFileDiff)
const problems = check(addedLines([diff, ...extra].join("\n")))
if (problems.length) {
	console.error([...problems, RULE].join("\n"))
	process.exit(1)
}
console.log("check:comments ok")
