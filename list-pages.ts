import { glob } from "node:fs/promises"

const pageFileGlob = "app/**/page.{js,jsx,ts,tsx}"
const pageFilePattern = /^page\.(js|jsx|ts|tsx)$/

export function normalizeRoutePath(path: string) {
	let normalizedPath = path.startsWith("/") ? path : `/${path}`
	normalizedPath = normalizedPath.replace(/\/{2,}/g, "/")

	if (normalizedPath.length > 1 && normalizedPath.endsWith("/"))
		normalizedPath = normalizedPath.slice(0, -1)

	return normalizedPath
}

export function isDynamicRoutePath(path: string) {
	return path
		.replaceAll("\\", "/")
		.split("/")
		.some((segment) => /\[.+\]/.test(segment))
}

export function pageFilePathToRoute(path: string) {
	const parts = path.replaceAll("\\", "/").split("/").filter(Boolean)
	const withoutApp = parts[0] === "app" ? parts.slice(1) : parts
	const withoutPageFile = pageFilePattern.test(withoutApp.at(-1) ?? "")
		? withoutApp.slice(0, -1)
		: withoutApp

	const routeParts = withoutPageFile.filter(
		(segment) => !(segment.startsWith("(") && segment.endsWith(")")),
	)

	return normalizeRoutePath(`/${routeParts.join("/")}`)
}

export async function listStaticRoutes() {
	const routes = new Set<string>()

	for await (const entry of glob(pageFileGlob)) {
		if (isDynamicRoutePath(entry)) continue

		routes.add(pageFilePathToRoute(entry))
	}

	return Array.from(routes).sort()
}
