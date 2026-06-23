import type { getDeploymentVersionMetadata } from "library/deploymentVersion"

import * as z from "zod"

const versionSchema = z.object({
	deploymentId: z.string().nullable(),
	commitSha: z.string().nullable(),
}) satisfies z.ZodType<ReturnType<typeof getDeploymentVersionMetadata>>

export const liveProxyEventSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("connected"),
		deployment: versionSchema,
	}),
	z.object({
		type: z.literal("refresh"),
	}),
])

export type LiveProxyEvent = z.infer<typeof liveProxyEventSchema>

export function stringifyLiveProxyEvent(event: LiveProxyEvent) {
	return JSON.stringify(liveProxyEventSchema.parse(event))
}
