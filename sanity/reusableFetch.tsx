import { fetchAssetMeta } from "library/sanity/assetMetadata"
import DraftModeOverlay from "library/sanity/DraftModeOverlay"
import { draftMode } from "next/headers"
import type { ClientPerspective, QueryParams } from "next-sanity"
import { defineLive } from "next-sanity/live"
import { client } from "sanity/lib/client"
import { token } from "sanity/lib/token"
import { Toaster } from "sonner"
import LiveWrapper, { handleError } from "./reusableFetchClient"

/**
 * Use defineLive to enable automatic revalidation and refreshing of your fetched content
 * Learn more: https://github.com/sanity-io/next-sanity?tab=readme-ov-file#1-configure-definelive
 */
const { sanityFetch: internalFetch, SanityLive: InternalLive } = defineLive({
	client,
	serverToken: token,
	browserToken: token,
})

/**
 * Used to fetch data in Server Components, it has built in support for handling Draft Mode and perspectives.
 * When using the "published" perspective then time-based revalidation is used, set to match the time-to-live on Sanity's API CDN (60 seconds)
 * and will also fetch from the CDN.
 * When using the "drafts" perspective then the data is fetched from the live API and isn't cached, it will also fetch draft content that isn't published yet.
 */
export async function libraryFetch<const QueryString extends string>({
	query,
	params = {},
	perspective,
	stega,
}: {
	query: QueryString
	params?: QueryParams | Promise<QueryParams>
	perspective?: Exclude<ClientPerspective, "raw">
	/**
	 * Good to know: Always set stega: false when calling sanityFetch within these:
	 *
	 * generateMetadata
	 * generateViewport
	 * generateSitemaps
	 * generateImageMetadata
	 *
	 * otherwise, stega should be true
	 */
	stega?: boolean
}) {
	const { data, sourceMap, tags } = await internalFetch({
		query,
		params,
		stega: stega ?? true,
		perspective,
	})

	return {
		data: await fetchAssetMeta(data),
		sourceMap,
		tags,
	}
}

export const LibraryLive = async () => {
	const { isEnabled: isDraftMode } = await draftMode()

	return (
		<LiveWrapper>
			<Toaster />
			{isDraftMode && <DraftModeOverlay />}
			<InternalLive onError={handleError} refreshOnFocus={false} />
		</LiveWrapper>
	)
}
