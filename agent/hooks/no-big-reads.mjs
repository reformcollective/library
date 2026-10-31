// Blocks whole-file reads of large generated files; search and small ranges still work.
const BIG = /(^|\/)(sanity\.types\.ts|schema\.json|pnpm-lock\.yaml|tsconfig\.tsbuildinfo)$/
const MAX_LINES = 200
let raw = ""
for await (const chunk of process.stdin) raw += chunk
const input = JSON.parse(raw).tool_input ?? {}
if (BIG.test(input.file_path ?? "") && !(input.limit > 0 && input.limit <= MAX_LINES)) {
	console.error(`${input.file_path} is generated and too large to read whole. Search it with Grep for the one name you need, or Read at most ${MAX_LINES} lines with offset and limit.`)
	process.exit(2)
}
