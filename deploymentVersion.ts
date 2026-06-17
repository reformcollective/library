export function getDeploymentVersionMetadata() {
	const deploymentId = process.env.VERCEL_DEPLOYMENT_ID
	const commitSha = process.env.VERCEL_GIT_COMMIT_SHA
	const public_deploymentId = process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID
	const public_commitSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

	// TODO:  remove after confirming availability on vercel
	console.log({
		deploymentId,
		commitSha,
		public_deploymentId,
		public_commitSha,
	})

	return {
		deploymentId: process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID || null,
		commitSha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || null,
	}
}
