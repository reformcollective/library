import { glob } from "node:fs/promises"
import { compileTime } from "./compile-time.ts"

const pageFileGlob = "app/**/page.{js,jsx,ts,tsx}"
const pageFilePattern = /^page\.(js|jsx|ts|tsx)$/

type StaticRouteSegments = Record<string, string | undefined>

function getDynamicSegmentName(segment: string) {
	const match = segment.match(/^\[([^.[\]]+)\]$/)
	return match?.[1]
}

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

function validateSegmentValue(name: string, value: string | undefined) {
	if (value == null) return
	if (!value) throw new Error(`Route segment "${name}" must not be empty.`)
	if (value.includes("/")) {
		throw new Error(`Route segment "${name}" must be a single path segment.`)
	}
}

function substituteRouteSegments(route: string, segments: StaticRouteSegments) {
	return normalizeRoutePath(
		route
			.split("/")
			.map((segment) => {
				const segmentName = getDynamicSegmentName(segment)
				return segmentName ? (segments[segmentName] ?? segment) : segment
			})
			.join("/"),
	)
}

const allRoutes = await compileTime(async () => {
	const routes = new Set<string>()

	for await (const entry of glob(pageFileGlob)) {
		routes.add(pageFilePathToRoute(entry))
	}

	return Array.from(routes).sort()
})

export function listStaticRoutes() {
	return allRoutes.filter((route) => !isDynamicRoutePath(route))
}

export function listRoutes(segments: StaticRouteSegments) {
	for (const [name, value] of Object.entries(segments)) {
		validateSegmentValue(name, value)
	}

	const routes = allRoutes
		.map((route) => substituteRouteSegments(route, segments))
		.filter((route) => !isDynamicRoutePath(route))

	return Array.from(new Set(routes)).sort()
}
