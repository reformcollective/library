// Runs the real React Compiler on changed files (against $BASE or the merge base with origin/main).
// --hook checks just the edited file, for the editor hook.
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

const require = createRequire(join(process.cwd(), "package.json"))
const babel = require("next/dist/compiled/babel/core")
const typescript = require("next/dist/compiled/babel/preset-typescript")
const compiler = require.resolve("babel-plugin-react-compiler")

const SOURCE = /\.[jt]sx?$/
const SKIP = /(\.d\.ts|\.css\.ts|\.test\.[jt]sx?|\.test-d\.tsx?)$|(^|\/)node_modules\//

const git = (...args) => execFileSync("git", args, { encoding: "utf8" })

function compile(path) {
	try {
		babel.transformFileSync(path, {
			babelrc: false,
			configFile: false,
			presets: [[typescript, { isTSX: path.endsWith("x"), allExtensions: true }]],
			plugins: [[compiler, { panicThreshold: "all_errors" }]],
		})
		return null
	} catch (error) {
		const message = String(error.message).replace(`${process.cwd()}/`, "").trim()
		return `${path}: React Compiler error\n${message.split("\n").slice(0, 12).join("\n")}`
	}
}

function changedFiles() {
	const base = process.env.BASE || git("merge-base", "HEAD", "origin/main").trim()
	const tracked = git("diff", "--name-only", "--diff-filter=d", base).split("\n")
	const untracked = git("ls-files", "--others", "--exclude-standard").split("\n")
	return [...tracked.flatMap((path) => (path === "library" ? libraryFiles(base) : [path])), ...untracked]
}

// The library repo has no Next install, so projects check the library files a bump brings in
function libraryFiles(base) {
	const inLibrary = (...args) => git("-C", "library", ...args).split("\n").filter(Boolean)
	try {
		const old = git("rev-parse", `${base}:library`).trim()
		const changed = [...inLibrary("diff", "--name-only", "--diff-filter=d", old), ...inLibrary("ls-files", "--others", "--exclude-standard")]
		return changed.map((path) => `library/${path}`)
	} catch {
		return inLibrary("ls-files").map((path) => `library/${path}`)
	}
}

let files
if (process.argv.includes("--hook")) {
	let raw = ""
	for await (const chunk of process.stdin) raw += chunk
	const path = JSON.parse(raw).tool_input?.file_path
	files = path ? [path.replace(`${process.cwd()}/`, "")] : []
} else {
	files = changedFiles()
}

const errors = files
	.filter((path) => path && SOURCE.test(path) && !SKIP.test(path) && existsSync(path))
	.map(compile)
	.filter(Boolean)

if (errors.length) {
	console.error([...errors, "Fix the code so the React Compiler accepts it. Common cause: ??, ?., ternaries or template literals inside a try; compute them into variables above it."].join("\n\n"))
	process.exit(process.argv.includes("--hook") ? 2 : 1)
}
if (!process.argv.includes("--hook")) console.log(`check:compiler ok (${files.filter((p) => SOURCE.test(p)).length} files)`)
