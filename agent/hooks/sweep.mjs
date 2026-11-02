// Session start: removes merged, clean builder worktrees, old temp folders and old reports.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const DAY = 24 * 60 * 60 * 1000
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const project = path.basename(root)
const now = Date.now()

function run(command, args, cwd) {
	return execFileSync(command, args, {
		cwd: cwd || root,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "ignore"],
	}).trim()
}

function succeeds(command, args, cwd) {
	try {
		run(command, args, cwd)
		return true
	} catch {
		return false
	}
}

function newest(target) {
	const stat = fs.lstatSync(target)
	let latest = stat.mtimeMs
	if (stat.isDirectory() && !stat.isSymbolicLink()) {
		for (const name of fs.readdirSync(target)) {
			latest = Math.max(latest, newest(path.join(target, name)))
		}
	}
	return latest
}

function busyFolders() {
	try {
		return run("lsof", ["-a", "-d", "cwd", "-Fn"])
			.split("\n")
			.filter((line) => line.startsWith("n/"))
			.map((line) => line.slice(1))
	} catch {
		return []
	}
}

function sweepWorktrees(removed, kept) {
	const base = path.resolve(root, "../worktrees", project) + path.sep
	const busy = busyFolders()
	const blocks = run("git", ["worktree", "list", "--porcelain"]).split("\n\n")
	for (const block of blocks) {
		const folder = block.match(/^worktree (.+)$/m)?.[1]
		const branch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1]
		if (!folder || !branch || !folder.startsWith(base)) continue
		const name = path.basename(folder)
		const merged =
			succeeds("git", ["merge-base", "--is-ancestor", branch, "HEAD"]) ||
			succeeds("git", ["merge-base", "--is-ancestor", branch, "origin/main"])
		if (!merged) continue
		if (run("git", ["status", "--porcelain"], folder) !== "") {
			kept.push(`${name} (uncommitted changes)`)
			continue
		}
		if (
			busy.some((cwd) => cwd === folder || cwd.startsWith(folder + path.sep))
		) {
			kept.push(`${name} (a program is running in it)`)
			continue
		}
		if (succeeds("git", ["worktree", "remove", folder])) {
			succeeds("git", ["branch", "-d", branch])
			removed.push(`worktree ${name}`)
		} else {
			kept.push(`${name} (git refused to remove it)`)
		}
	}
}

function sweepOld(folder, prefix, maxAge, label, removed) {
	if (!fs.existsSync(folder)) return
	for (const name of fs.readdirSync(folder)) {
		if (!name.startsWith(prefix)) continue
		const target = path.join(folder, name)
		if (now - newest(target) < maxAge) continue
		fs.rmSync(target, { recursive: true, force: true })
		removed.push(`${label} ${name}`)
	}
}

const removed = []
const kept = []
try {
	sweepWorktrees(removed, kept)
	sweepOld(os.tmpdir(), `reform-${project}-`, DAY, "temp", removed)
	sweepOld(
		path.join(os.homedir(), ".reform/reports", project),
		"",
		14 * DAY,
		"reports",
		removed,
	)
} catch (error) {
	kept.push(`sweep stopped early: ${error.message}`)
}
const parts = []
if (removed.length > 0) parts.push(`removed ${removed.join(", ")}`)
if (kept.length > 0) parts.push(`kept ${kept.join(", ")}`)
if (parts.length > 0) console.log(`Sweep: ${parts.join("; ")}.`)
