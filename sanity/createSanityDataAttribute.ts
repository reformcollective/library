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
	/**
	 * this is NOT the pathname, but rather a path to the property you want click-to-edit to go to
	 */
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
