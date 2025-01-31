/**
 * Support for NETLIFY and VERCEL deployments
 */

const overrideURL = process.env.NEXT_PUBLIC_SITE_OVERRIDE_URL

// Helper to safely check Vercel env
const isVercel = process.env.VERCEL === "1"
const isNetlify = process.env.NETLIFY === "true"

// Netlify URL logic
const netlifyURL = (() => {
	if (!isNetlify) return null
	return process.env.DEPLOY_PRIME_URL?.startsWith("https://main--")
		? process.env.URL
		: process.env.DEPLOY_URL
})()

// Vercel URL logic
const vercelURL = (() => {
	if (!isVercel) return null
	return process.env.VERCEL_ENV === "production"
		? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
		: `https://${process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL}`
})()

// Debug logging that won't break builds
const debugInfo = {
	platform: isVercel ? "Vercel" : isNetlify ? "Netlify" : "Local",
	netlifyVars: isNetlify
		? {
				DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
				URL: process.env.URL,
				DEPLOY_URL: process.env.DEPLOY_URL,
			}
		: null,
	vercelVars: isVercel
		? {
				VERCEL_ENV: process.env.VERCEL_ENV,
				VERCEL_URL: process.env.VERCEL_URL,
				VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
				VERCEL_PROJECT_PRODUCTION_URL:
					process.env.VERCEL_PROJECT_PRODUCTION_URL,
			}
		: null,
}

if (process.env.NODE_ENV === "development") {
	console.log("Deploy Environment:", debugInfo)
}

export const siteURL =
	overrideURL || vercelURL || netlifyURL || "http://localhost:3000"

// Only warn if we're in CI and can't determine the URL
if (process.env.CI && siteURL === "http://localhost:3000") {
	console.warn(
		`Warning: Using localhost URL in CI environment. Platform: ${debugInfo.platform}`,
	)
}
