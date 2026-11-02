// Rejects tool attribution: <commit-msg-file> for lefthook, --text "<pr text>" for CI
import { readFileSync } from "node:fs"

const BANNED = [
	// attribution only: plain mentions of the tool or its file names pass
	/co-authored-by:.*(claude|anthropic)/i,
	/\u{1F916}/u,
	/claude\.(com|ai)\/claude-code/i,
	/\b(generated|written|made|created|authored|built)\s+(with|by|using)\s+(\[?claude|anthropic|ai\b|an ai\b)/i,
	/\bai[- ](generated|written|assisted)\b/i,
]

const args = process.argv.slice(2)
const text =
	args[0] === "--text" ? args.slice(1).join(" ") : readFileSync(args[0], "utf8")
const lines = text.split("\n").filter((line) => !line.startsWith("#"))

const hits = lines.filter((line) =>
	BANNED.some((pattern) => pattern.test(line)),
)
if (hits.length) {
	console.error("No AI attribution in commits or PRs. Remove these lines:")
	for (const line of hits) console.error(`  ${line}`)
	process.exit(1)
}
