import { env } from "app/env"
import { siteURL } from "library/siteURL"
import { createDataAttribute } from "next-sanity"
import { studioUrl } from "sanity/lib/api"

export const createSanityDataAttribute = ({
	documentId,
	path,
	documentType,
}: {
	documentId: string
	documentType: string
	path: string
}) => {
	return createDataAttribute({
		projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
		dataset: env.NEXT_PUBLIC_SANITY_DATASET,
		baseUrl: `${siteURL}${studioUrl}`,
		id: documentId,
		type: documentType,
		path,
	}).toString()
}
