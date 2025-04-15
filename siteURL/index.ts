/**
 * if you want to manually specify a URL, specify NEXT_PUBLIC_DEPLOY_URL or update your next config
 */

const isNext = !!process.env.NEXT_RUNTIME
const environmentURL = process.env.NEXT_PUBLIC_DEPLOY_URL

if (isNext && !environmentURL)
	throw new Error("NEXT_PUBLIC_DEPLOY_URL is not set in next config")

export const siteURL = environmentURL || "http://localhost:3000"
