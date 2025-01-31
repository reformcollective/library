/**
 * currently, NETLIFY and VERCEL are supported
 */

const overrideURL = process.env.NEXT_PUBLIC_SITE_OVERRIDE_URL

const netlifyURL = process.env.DEPLOY_PRIME_URL?.startsWith("https://main--")
	? process.env.URL
	: process.env.DEPLOY_URL

const vercelURL =
	process.env.VERCEL_ENV === "production"
		? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
		: `https://${process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL}`

// Add debug logging in production
if (process.env.VERCEL === "1") {
	console.log("Vercel Environment Variables:", {
		VERCEL_ENV: process.env.VERCEL_ENV,
		VERCEL_URL: process.env.VERCEL_URL,
		VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
		VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
		computed_url: vercelURL,
	})
}

export const siteURL =
	overrideURL || vercelURL || netlifyURL || "http://localhost:3000"

// Enhance warning message
if (process.env.CI && siteURL.includes("localhost")) {
	console.warn(
		"Warning: Falling back to localhost. Environment variables not properly set.",
		{
			platform:
				process.env.VERCEL === "1"
					? "Vercel"
					: process.env.NETLIFY === "true"
						? "Netlify"
						: "Unknown",
			siteURL,
			overrideURL,
			vercelURL,
			netlifyURL,
		},
	)
	console.warn(`
Platform Environment Variables:
NETLIFY:
  DEPLOY_PRIME_URL: ${process.env.DEPLOY_PRIME_URL || "not set"}
  URL: ${process.env.URL || "not set"}
  DEPLOY_URL: ${process.env.DEPLOY_URL || "not set"}

VERCEL:
  VERCEL: ${process.env.VERCEL || "not set"}
  VERCEL_ENV: ${process.env.VERCEL_ENV || "not set"}
  VERCEL_URL: ${process.env.VERCEL_URL || "not set"}
  VERCEL_BRANCH_URL: ${process.env.VERCEL_BRANCH_URL || "not set"}
  VERCEL_PROJECT_PRODUCTION_URL: ${process.env.VERCEL_PROJECT_PRODUCTION_URL || "not set"}
`)
}
