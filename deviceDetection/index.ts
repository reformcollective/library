import BrowserDetector from "browser-dtector"

// environment detection
// sanity will run in JSDOM, so check for that to ensure we're not running extra code for schema scripts
const isJSDOM =
	typeof window !== "undefined" &&
	window?.navigator.userAgent.toLowerCase().includes("jsdom")
export const isCI = !!process.env.CI
export const isBrowser = typeof window !== "undefined" && !isJSDOM && !isCI
export const isServer = typeof window === "undefined" || isJSDOM || isCI

// browser detection
const detector = isBrowser ? new BrowserDetector() : undefined
const data = detector?.parseUserAgent()
export type BrowserData = Partial<
	NonNullable<typeof data> & {
		// additional data that we'll be adding
		isIOS: boolean
		isMobileOS: boolean
	}
>

const isIOS = data ? data.isSafari && navigator.maxTouchPoints > 4 : false
const isIPad = isIOS && data?.platform === "Macintosh"

export const browserData: BrowserData = data
	? ({
			...data,
			platform: isIPad ? "IPad" : data.platform,
			isTablet: isIPad ? true : data.isTablet,
			isDesktop: isIPad ? false : data.isDesktop,
			isIOS,
			isMobileOS: isIOS || data.isAndroid,
		} satisfies Required<BrowserData>)
	: {}
