/**
 * this script keeps the submodule hash in project workflows up to date
 * because github actions doesn't support local reusable workflows in submodules
 */

const { execSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

// Path to the submodule
const submodulePath = "app/library"

// Path to the .github/workflows folder
const workflowsPath = ".github/workflows"

// Regex to match the submodule reference in workflow files
const submoduleRegex = /(code-checks|check-updates|lighthouse)\.yml@(.*)/g

try {
	// Get the latest commit hash of the submodule
	const latestHash = execSync(`git -C ${submodulePath} rev-parse HEAD`)
		.toString()
		.trim()

	console.log(`Latest hash of submodule at ${submodulePath}: ${latestHash}`)

	// Update all files in the workflows folder
	const files = fs.readdirSync(workflowsPath)

	for (const file of files) {
		const filePath = path.join(workflowsPath, file)

		if (fs.statSync(filePath).isFile() && file.endsWith(".yml")) {
			const content = fs.readFileSync(filePath, "utf8")

			// Replace the old hash with the new one
			const updatedContent = content.replace(
				submoduleRegex,
				(match, fileName, oldHash) => {
					if (oldHash !== latestHash) {
						console.log(
							`Updating ${fileName} from [${oldHash}] to [${latestHash}]`,
						)
					}
					return `${fileName}.yml@${latestHash}`
				},
			)

			// Write back the updated content if it has changed
			if (content !== updatedContent) {
				fs.writeFileSync(filePath, updatedContent, "utf8")
				console.log(`Updated: ${filePath}`)
			}
		}
	}

	console.log("Submodule hashes updated successfully.")
} catch (error) {
	console.error("Error updating submodule hash:", error.message)
	process.exit(1)
}
