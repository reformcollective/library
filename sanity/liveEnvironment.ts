export const fluidComputeUnavailableEnvironmentVariables = [
	"AWS_EXECUTION_ENV",
	"AWS_LAMBDA_EXEC_WRAPPER",
	"AWS_LAMBDA_FUNCTION_MEMORY_SIZE",
	"AWS_LAMBDA_FUNCTION_NAME",
	"AWS_LAMBDA_FUNCTION_VERSION",
	"AWS_LAMBDA_INITIALIZATION_TYPE",
	"AWS_LAMBDA_LOG_GROUP_NAME",
	"AWS_LAMBDA_LOG_STREAM_NAME",
	"AWS_LAMBDA_RUNTIME_API",
	"AWS_XRAY_CONTEXT_MISSING",
	"AWS_XRAY_DAEMON_ADDRESS",
	"LAMBDA_RUNTIME_DIR",
	"LAMBDA_TASK_ROOT",
	"_AWS_XRAY_DAEMON_ADDRESS",
	"_AWS_XRAY_DAEMON_PORT",
	"_HANDLER",
	"_LAMBDA_TELEMETRY_LOG_FD",
] as const

export function isNextProductionBuild() {
	return process.env.NEXT_PHASE === "phase-production-build"
}

export function isLocalSiteURL(candidate: string) {
	try {
		const { hostname } = new URL(candidate)
		return (
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			hostname === "::1" ||
			hostname === "[::1]"
		)
	} catch {
		return false
	}
}

export function getLiveProxySupport({
	allowProxy = true,
	currentSiteURL,
}: {
	allowProxy?: boolean
	currentSiteURL: string
}) {
	const isVercel = process.env.VERCEL === "1"
	const missingFluidComputeUnavailableEnvironmentVariables =
		fluidComputeUnavailableEnvironmentVariables.filter(
			(variable) => process.env[variable] === undefined,
		)
	const isVercelFluidCompute =
		isVercel &&
		missingFluidComputeUnavailableEnvironmentVariables.length ===
			fluidComputeUnavailableEnvironmentVariables.length
	const isLocalSite = isLocalSiteURL(currentSiteURL)
	const runtimeSupportsLiveProxy = isLocalSite || isVercelFluidCompute
	const canUseLiveProxy = allowProxy && runtimeSupportsLiveProxy

	return {
		allowProxy,
		canUseLiveProxy,
		isLocalSite,
		isVercel,
		isVercelFluidCompute,
		runtimeSupportsLiveProxy,
	}
}

export function getLiveProxyUnsupportedMessage() {
	return "Sanity live proxy requires a local site URL or Vercel Fluid Compute."
}
