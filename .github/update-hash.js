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

// Path to the submodule (../)
const submodulePath = path.join(__dirname, "..")

// Path to the .github/workflows folder
const workflowsPath = ".github/workflows"

// Regex to match the submodule reference in workflow files
const submoduleRegex = /(code-checks|check-updates|lighthouse)\.yml@(.*)/g

try {
	// Get the latest commit hash of the submodule
	const latestHash = execSync(`git -C ${submodulePath} rev-parse HEAD`)
		.toString()
		.trim()

	// Update all files in the workflows folder
	const files = fs.readdirSync(workflowsPath)

	for (const file of files) {
		const filePath = path.join(workflowsPath, file)

		if (fs.statSync(filePath).isFile() && file.endsWith(".yml")) {
			const content = fs.readFileSync(filePath, "utf8")

			// Replace the old hash with the new one
			const updatedContent = content.replace(
				submoduleRegex,
				(_match, fileName, _oldHash) => {
					return `${fileName}.yml@${latestHash}`
				},
			)

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
