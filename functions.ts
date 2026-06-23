import { siteURL } from "./siteURL"

export const sleep = (ms: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms)
	})

export function pathnameMatches(pathA: string, pathB: string) {
	return pathA === pathB || pathA === `${pathB}/` || pathB === `${pathA}/`
}

const parseURL = (url: string, base?: string) => {
	try {
		return new URL(url, base)
	} catch {
		return undefined
	}
}

export function linkIsInternal(to: string) {
	const site = new URL(siteURL)

	// attempt to parse this as standalone, else try to parse it as relative
	const parsed = parseURL(to) || parseURL(to, site.origin)

	// if we can't parse it, assume it's external
	if (!parsed) return false

	// if the host matches, it's internal
	return (
		parsed.host === site.host ||
		// www.origin.com and origin.com are both considered internal
		`www.${parsed.host}` === site.host ||
		parsed.host === `www.${site.host}`
	)
}

export function linkIsExternal(to: string) {
	return !linkIsInternal(to)
}

export const getRandomInt = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

export const getRandomFloat = (min: number, max: number) => {
	return Math.random() * (max - min) + min
}

export function measureSticky<T>(
	element: Element | null | undefined,
	value: T,
) {
	return () => {
		if (!element) return value
		if (!(element instanceof HTMLElement)) return value
		element.style.position = "static"
		queueMicrotask(() => {
			element.style.removeProperty("position")
		})

		return value
	}
}
