import { client } from "@/sanity/lib/client"
import { token } from "@/sanity/lib/token"
import DraftModeToast from "library/sanity/DraftModeToast"
import { fetchAssetMeta } from "library/sanity/assetMetadata"
import {
	defineLive,
	VisualEditing,
	type ClientPerspective,
	type QueryParams,
} from "next-sanity"
import { draftMode } from "next/headers"
import { Toaster } from "sonner"
import LiveWrapper, { handleError } from "./reusableFetchClient"

/**
 * Use defineLive to enable automatic revalidation and refreshing of your fetched content
 * Learn more: https://github.com/sanity-io/next-sanity?tab=readme-ov-file#1-configure-definelive
 */

const { sanityFetch: internalFetch, SanityLive: InternalLive } = defineLive({
	client,
	// Required for showing draft content when the Sanity Presentation Tool is used, or to enable the Vercel Toolbar Edit Mode
	serverToken: token,
	// Required for stand-alone live previews, the token is only shared to the browser if it's a valid Next.js Draft Mode session
	browserToken: token,
})

/**
 * Used to fetch data in Server Components, it has built in support for handling Draft Mode and perspectives.
 * When using the "published" perspective then time-based revalidation is used, set to match the time-to-live on Sanity's API CDN (60 seconds)
 * and will also fetch from the CDN.
 * When using the "previewDrafts" perspective then the data is fetched from the live API and isn't cached, it will also fetch draft content that isn't published yet.
 */
const sanityFetch = async <const QueryString extends string>({
	query,
	params = {},
	perspective,
	stega,
	tag,
}: {
	query: QueryString
	params?: QueryParams | Promise<QueryParams>
	perspective?: Exclude<ClientPerspective, "raw">
	stega?: boolean
	tag?: string
}) => {
	const { data, sourceMap, tags } = await internalFetch({
		query,
		params,
		stega,
		perspective,
		tag,
	})

	return {
		data: await fetchAssetMeta(data),
		sourceMap,
		tags,
	}
}

export const SanityLive = async () => {
	const { isEnabled: isDraftMode } = await draftMode()

	return (
		<>
			<Toaster />
			{isDraftMode && (
				<>
					<DraftModeToast />
					<VisualEditing />
				</>
			)}
			<LiveWrapper>
				<InternalLive onError={handleError} />
			</LiveWrapper>
		</>
	)
}

export { sanityFetch }
