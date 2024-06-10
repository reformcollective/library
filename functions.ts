import { isBrowser } from "./deviceDetection"

export const addDebouncedEventListener = (
	element: Window | HTMLElement,
	event: string,
	callback: () => void,
	delay: number,
) => {
	let timeout: NodeJS.Timeout

	const debouncedCallback = () => {
		clearTimeout(timeout)
		timeout = setTimeout(() => callback(), delay)
	}

	element.addEventListener(event, debouncedCallback)
	return () => element.removeEventListener(event, debouncedCallback)
}

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
	} catch (error) {
		return undefined
	}
}

export function linkIsInternal(to: string) {
	// if we're not in the browser, we can't parse URLs accurately
	if (!isBrowser) return false

	// attempt to parse this as standalone, else try to parse it as relative
	const parsed = parseURL(to) || parseURL(to, window.location.origin)

	// if we can't parse it, assume it's external
	if (!parsed) return false

	// if the origin matches, it's internal
	return parsed.origin === window.location.origin
}

export function linkIsExternal(to: string) {
	return !linkIsInternal(to)
}

export const getRandomInt = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1) + min)
}
