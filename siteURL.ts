/**
 * currently, NETLIFY and VERCEL are supported
 *
 * prefer adding support for other platforms here
 * rather then overriding the URL manually
 */

const netlifyURL = process.env.DEPLOY_PRIME_URL?.startsWith("https://main--")
	? // if we're on prod branch, use the public URL
		process.env.URL
	: // otherwise, use this deploy's unique URL
		process.env.DEPLOY_URL

const vercelURL = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: undefined

export const siteURL = vercelURL || netlifyURL || "http://localhost:3000"

if (process.env.NODE_ENV === "production" && siteURL.includes("localhost")) {
	console.warn(
		"site depends on NETLIFY or VERCEL environment variables, which are not present.",
	)
}
