import { readFileSync, realpathSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import type { default as Semver } from "semver"

const require = createRequire(import.meta.url)
const semver =
	require("../../node_modules/.pnpm-config/semver/index.js") as typeof Semver

type PackageManifest = {
	name?: string
	dependencies?: Record<string, string>
	devDependencies?: Record<string, string>
	optionalDependencies?: Record<string, string>
	peerDependencies?: Record<string, string>
}

type PnpmConfig = {
	publicHoistPattern?: Array<string>
}

const FORBIDDEN_DEPENDENCY_FIELDS = [
	"devDependencies",
	"optionalDependencies",
	"peerDependencies",
] satisfies Array<keyof PackageManifest>
const PUBLIC_LIBRARY_DEPENDENCY_PATTERNS = [
	"stylelint-config-*",
	"stylelint-plugin-*",
]

function readManifest(url: URL): PackageManifest {
	return JSON.parse(readFileSync(url, "utf8")) as PackageManifest
}

const rootManifestUrl = new URL("../../package.json", import.meta.url)
const libraryManifestUrl = new URL("../package.json", import.meta.url)
const rootManifestDirectory = dirname(fileURLToPath(rootManifestUrl))
const libraryManifestDirectory = dirname(fileURLToPath(libraryManifestUrl))
const rootManifest = readManifest(rootManifestUrl)
const libraryManifest = readManifest(libraryManifestUrl)

function isFileSpecifier(specifier: string) {
	return specifier.startsWith("file:")
}

function resolveFileSpecifier(specifier: string, manifestDirectory: string) {
	return realpathSync(
		resolve(manifestDirectory, specifier.slice("file:".length)),
	)
}

function fileSpecifiersPointToSameFile(
	rootRange: string,
	libraryRange: string,
) {
	return (
		resolveFileSpecifier(rootRange, rootManifestDirectory) ===
		resolveFileSpecifier(libraryRange, libraryManifestDirectory)
	)
}

/**
 * ensures that the provided package manifest does not include forbidden dependency fields
 */
function assertDependencyFields(manifest: PackageManifest) {
	const invalidFields: Array<string> = []

	for (const field of FORBIDDEN_DEPENDENCY_FIELDS) {
		if (Object.hasOwn(manifest, field)) {
			invalidFields.push(field)
		}
	}

	if (invalidFields.length === 0) return

	throw new Error(
		`library package.json must only use dependencies. Move entries from ${invalidFields.join(", ")} into dependencies and remove the keys.`,
	)
}

/**
 * filters the library's dependency list to remove dependencies that are included by the root manifest
 */
function filterDependencies(dependencies: Record<string, string> | undefined) {
	if (!dependencies) return dependencies

	const filteredDependencies: Record<string, string> = {}

	for (const [name, libraryRange] of Object.entries(dependencies)) {
		const rootRange = rootManifest.dependencies?.[name]

		// if not in root, keep in library
		// if is in root, verify compatible
		if (!rootRange) {
			filteredDependencies[name] = libraryRange
			continue
		}

		const libraryValidRange = semver.validRange(libraryRange)
		const rootValidRange = semver.validRange(rootRange)

		if (!libraryValidRange || !rootValidRange) {
			if (isFileSpecifier(rootRange) && isFileSpecifier(libraryRange)) {
				if (fileSpecifiersPointToSameFile(rootRange, libraryRange)) continue

				throw new Error(
					`cannot deduplicate ${name} from library dependencies: file specifiers must point to the same file. root uses (${rootRange}), library uses (${libraryRange})`,
				)
			}

			if (libraryRange === rootRange) continue

			throw new Error(
				`cannot deduplicate ${name} from library dependencies: non-semver specifiers must match exactly. root uses (${rootRange}), library uses (${libraryRange})`,
			)
		}

		if (!semver.intersects(rootRange, libraryRange)) {
			throw new Error(
				`cannot deduplicate ${name} from library dependencies: root range (${rootRange}) does not overlap library range (${libraryRange})`,
			)
		}

		if (
			// because we are filtering the library, the root range must always satisfy the library's specifier
			!semver.subset(rootRange, libraryRange)
		) {
			throw new Error(
				`cannot deduplicate ${name} from library dependencies: root range (${rootRange}) allows versions outside library range (${libraryRange})`,
			)
		}
	}

	return filteredDependencies
}

function readPackage(pkg: PackageManifest) {
	if (pkg.name !== libraryManifest.name) return pkg

	for (const field of FORBIDDEN_DEPENDENCY_FIELDS) {
		if (
			Object.hasOwn(libraryManifest, field) &&
			Object.keys(libraryManifest[field] ?? {}).length === 0
		) {
			delete libraryManifest[field]
			delete pkg[field]
		}
	}

	assertDependencyFields(libraryManifest)
	assertDependencyFields(libraryManifest)
	pkg.dependencies = filterDependencies(pkg.dependencies)

	return pkg
}

function updateConfig(config: PnpmConfig) {
	return {
		...config,
		publicHoistPattern: Array.from(
			new Set([
				...(config.publicHoistPattern ?? []),
				...PUBLIC_LIBRARY_DEPENDENCY_PATTERNS,
			]),
		),
	}
}

export const hooks = {
	readPackage,
	updateConfig,
}
