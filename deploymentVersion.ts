export function getDeploymentVersionMetadata() {
	const deploymentId = process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID||null
  const commitSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || null

  if (!deploymentId || !commitSha) console.warn("build metadata is missing!")

  return {
    deploymentId,commitSha
	}
}
