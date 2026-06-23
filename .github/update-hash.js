/**
 * this script keeps the submodule hash in project workflows up to date
 * because github actions doesn't support local reusable workflows in submodules
 */

import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to the .github/workflows folder
const workflowsPath = ".github/workflows"

// Submodule name (folder name relative to repo root)
const submoduleName = path.basename(path.join(__dirname, ".."))

// Regex to match the submodule reference in workflow files
const submoduleRegex = /(code-checks|check-updates|lighthouse)\.yml@(.*)/g

try {
	// Get the latest commit hash of the submodule from the parent repo's index.
	// Using `git ls-files --stage` rather than `git -C library rev-parse HEAD`
	// because in git worktrees the submodule's .git redirect can cause the
	// latter to resolve HEAD against the wrong context.
	const lsOutput = execSync(`git ls-files --stage -- ${submoduleName}`).toString().trim()
	// Output format: "160000 <hash> 0\t<name>"
	const latestHash = lsOutput.split(/\s+/)[1]
	if (!latestHash)
		throw new Error(`Could not determine submodule hash for "${submoduleName}" from git index`)

	// Update all files in the workflows folder
	const files = fs.readdirSync(workflowsPath)

	for (const file of files) {
		const filePath = path.join(workflowsPath, file)

		if (fs.statSync(filePath).isFile() && file.endsWith(".yml")) {
			const content = fs.readFileSync(filePath, "utf8")

			// Replace the old hash with the new one
			const updatedContent = content.replace(submoduleRegex, (_match, fileName, _oldHash) => {
				return `${fileName}.yml@${latestHash}`
			})

			// Write back the updated content if it has changed
			if (content !== updatedContent) {
				fs.writeFileSync(filePath, updatedContent, "utf8")
			}
		}
	}
} catch (error) {
	console.error("Error updating submodule hash:", error.message)
	process.exit(1)
}
