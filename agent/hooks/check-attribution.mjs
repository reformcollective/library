// Rejects tool attribution: <commit-msg-file> for lefthook, --text "<pr text>" for CI
import { readFileSync } from "node:fs"

const BANNED = [
	/co-authored-by:.*(claude|anthropic|noreply@anthropic)/i,
	/generated with \[?claude/i,
	/\u{1F916}/u,
	/\bclaude\b/i,
	/\banthropic\b/i,
	/\bai[- ]generated\b/i,
]

const args = process.argv.slice(2)
const text = args[0] === "--text" ? args.slice(1).join(" ") : readFileSync(args[0], "utf8")
const lines = text.split("\n").filter((line) => !line.startsWith("#"))

const hits = lines.filter((line) => BANNED.some((pattern) => pattern.test(line)))
if (hits.length) {
	console.error("No AI attribution in commits or PRs. Remove these lines:")
	for (const line of hits) console.error(`  ${line}`)
	process.exit(1)
}
