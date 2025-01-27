/**
 * currently, NETLIFY and VERCEL are supported
 *
 * if you need to override the site URL, for example to deploy on another platform
 *
 * either update this file to support that platform
 * OR you can set the NEXT_PUBLIC_SITE_OVERRIDE_URL environment variable
 */

const overrideURL = process.env.NEXT_PUBLIC_SITE_OVERRIDE_URL

const netlifyURL = process.env.DEPLOY_PRIME_URL?.startsWith("https://main--")
	? // if we're on prod branch, use the public URL
		process.env.URL
	: // otherwise, use this deploy's unique URL
		process.env.DEPLOY_URL

const vercelURL = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: undefined

export const siteURL =
	overrideURL || vercelURL || netlifyURL || "http://localhost:3000"

if (process.env.CI && siteURL.includes("localhost")) {
	console.warn(
		"site depends on NETLIFY or VERCEL environment variables, which are not present.",
	)
	console.warn(`
NETLIFY:
	DEPLOY_PRIME_URL: ${process.env.DEPLOY_PRIME_URL || "not set"}
	URL: ${process.env.URL || "not set"}
	DEPLOY_URL: ${process.env.DEPLOY_URL || "not set"}

VERCEL:
	VERCEL_URL: ${process.env.VERCEL_URL || "not set"}
`)
}
