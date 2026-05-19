import { glob } from "node:fs/promises"

const pageFileGlob = "app/**/page.{js,jsx,ts,tsx}"
const pageFilePattern = /^page\.(js|jsx|ts|tsx)$/

type StaticRouteSegments = Record<string, string | undefined>

function getDynamicSegmentName(segment: string) {
	const match = segment.match(/^\[([^.[\]]+)\]$/)
	return match?.[1]
}

function hasSegmentValue(segment: string, segments: StaticRouteSegments) {
	const segmentName = getDynamicSegmentName(segment)
	return segmentName ? segments[segmentName] != null : false
}

export function normalizeRoutePath(path: string) {
	let normalizedPath = path.startsWith("/") ? path : `/${path}`
	normalizedPath = normalizedPath.replace(/\/{2,}/g, "/")

	if (normalizedPath.length > 1 && normalizedPath.endsWith("/"))
		normalizedPath = normalizedPath.slice(0, -1)

	return normalizedPath
}

export function isDynamicRoutePath(
	path: string,
	segments: StaticRouteSegments = {},
) {
	return path
		.replaceAll("\\", "/")
		.split("/")
		.some(
			(segment) =>
				/\[.+\]/.test(segment) && !hasSegmentValue(segment, segments),
		)
}

export function pageFilePathToRoute(
	path: string,
	segments: StaticRouteSegments = {},
) {
	const parts = path.replaceAll("\\", "/").split("/").filter(Boolean)
	const withoutApp = parts[0] === "app" ? parts.slice(1) : parts
	const withoutPageFile = pageFilePattern.test(withoutApp.at(-1) ?? "")
		? withoutApp.slice(0, -1)
		: withoutApp

	const routeParts = withoutPageFile
		.filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
		.map((segment) => {
			const segmentName = getDynamicSegmentName(segment)
			return segmentName ? (segments[segmentName] ?? segment) : segment
		})

	return normalizeRoutePath(`/${routeParts.join("/")}`)
}

export async function listStaticRoutes(segments: StaticRouteSegments = {}) {
	const routes = new Set<string>()

	for await (const entry of glob(pageFileGlob)) {
		if (isDynamicRoutePath(entry, segments)) continue

		routes.add(pageFilePathToRoute(entry, segments))
	}

	return Array.from(routes).sort()
}
