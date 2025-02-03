/**
 * Support for NETLIFY and VERCEL deployments
 */

const overrideURL = process.env.NEXT_PUBLIC_SITE_OVERRIDE_URL

// Helper to safely check environments
const isVercel = process.env.VERCEL === "1"
const isNetlify = process.env.NETLIFY === "true"
const isCI = !!process.env.CI

// Netlify URL logic
const netlifyURL = (() => {
	if (!isNetlify) return null
	return process.env.HEAD === "main" ? process.env.URL : process.env.DEPLOY_URL
})()

// Vercel URL logic
const vercelURL = (() => {
	if (!isVercel) return null
	return process.env.VERCEL_GIT_COMMIT_REF === "main"
		? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
		: `https://${process.env.VERCEL_URL}`
})()

// Debug logging in CI environments
if (isCI) {
	console.log("Deploy Environment:", {
		platform: isVercel ? "Vercel" : isNetlify ? "Netlify" : "Other CI",
		netlifyVars: isNetlify
			? {
					DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
					URL: process.env.URL,
					DEPLOY_URL: process.env.DEPLOY_URL,
					HEAD: process.env.HEAD,
				}
			: null,
		vercelVars: isVercel
			? {
					VERCEL_ENV: process.env.VERCEL_ENV,
					VERCEL_URL: process.env.VERCEL_URL,
					VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
					VERCEL_PROJECT_PRODUCTION_URL:
						process.env.VERCEL_PROJECT_PRODUCTION_URL,
					VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
				}
			: null,
	})
}

export const siteURL =
	overrideURL || vercelURL || netlifyURL || "http://localhost:3000"

// Only warn if we're in CI and can't determine the URL
if (isCI && siteURL === "http://localhost:3000") {
	console.warn(
		"Warning: Unable to determine deployment URL in CI environment. Check platform environment variables.",
	)
}
