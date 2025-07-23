if (typeof window !== "undefined")
	throw new Error("This file should not be imported in the browser")

/**
 * Support for NETLIFY and VERCEL deployments
 */

const PORT = process.env.PORT || 3000

// Helper to safely check environments
const isVercel = process.env.VERCEL === "1"
const isNetlify = process.env.NETLIFY === "true"
const isCI = !!process.env.CI

// ANSI color codes for prettier logging
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	red: "\x1b[31m",
	bg: {
		blue: "\x1b[44m",
		green: "\x1b[42m",
		magenta: "\x1b[45m",
	},
}

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
	const platform = isVercel ? "Vercel" : isNetlify ? "Netlify" : "Other CI"
	const platformColor = isVercel
		? colors.cyan
		: isNetlify
			? colors.green
			: colors.yellow
	console.log(
		`${colors.bright}Deploy Environment:${colors.reset} ${platformColor}${platform}${colors.reset}`,
	)

	if (isNetlify) {
		console.log(
			`\n${colors.green}${colors.bright}Netlify Details:${colors.reset}`,
		)
		console.log(
			`  ${colors.dim}HEAD:${colors.reset} ${process.env.HEAD || "undefined"}`,
		)
		console.log(
			`  ${colors.dim}DEPLOY_PRIME_URL:${colors.reset} ${process.env.DEPLOY_PRIME_URL || "undefined"}`,
		)
		console.log(
			`  ${colors.dim}URL:${colors.reset} ${process.env.URL || "undefined"}`,
		)
		console.log(
			`  ${colors.dim}DEPLOY_URL:${colors.reset} ${process.env.DEPLOY_URL || "undefined"}`,
		)
	} else if (isVercel) {
		console.log(
			`\n${colors.cyan}${colors.bright}Vercel Details:${colors.reset}`,
		)
		console.log(
			`  ${colors.dim}VERCEL_ENV:${colors.reset} ${process.env.VERCEL_ENV || "undefined"}`,
		)
		console.log(
			`  ${colors.dim}VERCEL_GIT_COMMIT_REF:${colors.reset} ${process.env.VERCEL_GIT_COMMIT_REF || "undefined"}`,
		)
		console.log(
			`  ${colors.dim}VERCEL_URL:${colors.reset} ${process.env.VERCEL_URL || "undefined"}`,
		)
		console.log(
			`  ${colors.dim}VERCEL_BRANCH_URL:${colors.reset} ${process.env.VERCEL_BRANCH_URL || "undefined"}`,
		)
		console.log(
			`  ${colors.dim}VERCEL_PROJECT_PRODUCTION_URL:${colors.reset} ${process.env.VERCEL_PROJECT_PRODUCTION_URL || "undefined"}`,
		)
	}

	const siteUrl = vercelURL || netlifyURL || `http://localhost:${PORT}`
	console.log(
		`\n${colors.bright}Site URL:${colors.reset} ${colors.magenta}${siteUrl}${colors.reset}`,
	)
	console.log(
		`${colors.blue}⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯${colors.reset}\n`,
	)
}

export const serverSiteURL =
	vercelURL || netlifyURL || `http://localhost:${PORT}`

// Only warn if we're in CI and can't determine the URL
if (isCI && serverSiteURL === `http://localhost:${PORT}`) {
	console.warn(
		`${colors.bright}${colors.red}Warning:${colors.reset} Unable to determine deployment URL in CI environment. Check platform environment variables.`,
	)
}

if (serverSiteURL.includes("undefined")) {
	console.warn(
		`${colors.bright}${colors.red}Warning:${colors.reset} We tried to determine the deployment URL, but it may be undefined. Check platform environment variables.`,
	)
}
