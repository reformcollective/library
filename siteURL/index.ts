/**
 * if you want to manually specify a URL, specify NEXT_PUBLIC_DEPLOY_URL or update your next config
 */

const environmentURL = process.env.NEXT_PUBLIC_DEPLOY_URL
if (!environmentURL)
	throw new Error("NEXT_PUBLIC_DEPLOY_URL is not set in next config")

export const siteURL = environmentURL
