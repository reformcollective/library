// The Read tool's .env ask rules do not cover the shell, so shell commands that name one ask too.
const ENV_FILE =
	/(?:^|[\s/'"=<>:;|&(])(\.env(?:\.[\w.-]+)?)(?=$|[\s'";|&)<>*])/g
let raw = ""
for await (const chunk of process.stdin) raw += chunk
const command = JSON.parse(raw).tool_input?.command ?? ""
const files = [...command.matchAll(ENV_FILE)]
	.map((match) => match[1])
	.filter((file) => file !== ".env.example")
if (files.length > 0) {
	console.log(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "ask",
				permissionDecisionReason: `This command touches ${[...new Set(files)].join(", ")}, which can hold secrets.`,
			},
		}),
	)
}
