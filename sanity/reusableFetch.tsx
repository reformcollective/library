import { fetchAssetMeta } from "library/sanity/assetMetadata"
import DraftModeOverlay from "library/sanity/DraftModeOverlay"
import { draftMode } from "next/headers"
import type { ClientPerspective, QueryParams } from "next-sanity"
import { defineLive } from "next-sanity/live"
import { client } from "sanity/lib/client"
import { token } from "sanity/lib/token"
import { Toaster } from "sonner"
import { FirefoxFix } from "./FirefoxFix"
import LiveWrapper, { handleError } from "./reusableFetchClient"

/**
 * Use defineLive to enable automatic revalidation and refreshing of your fetched content
 * Learn more: https://github.com/sanity-io/next-sanity?tab=readme-ov-file#1-configure-definelive
 */
const { sanityFetch: internalFetch, SanityLive: InternalLive } = defineLive({
	client,
	serverToken: token,
	browserToken: token,
	fetchOptions: { revalidate: Infinity },
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
	disableStega,
}: {
	query: QueryString
	params?: QueryParams | Promise<QueryParams>
	perspective?: Exclude<ClientPerspective, "raw">
	/**
	 * Good to know: Always disable stega when calling sanityFetch within these:
	 *
	 * generateMetadata
	 * generateViewport
	 * generateSitemaps
	 * generateImageMetadata
	 *
	 * otherwise, stega should be undefined
	 */
	disableStega?: boolean
}) {
	const { data, sourceMap, tags } = await internalFetch({
		query,
		params,
		stega: disableStega ? false : undefined, // default to false
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
			<FirefoxFix />
			{isDraftMode && <DraftModeOverlay />}
			<InternalLive
				onError={handleError}
				refreshOnFocus={false}
				refreshOnMount={false}
				refreshOnReconnect={false}
				intervalOnGoAway={false}
			/>
		</LiveWrapper>
	)
}

/**
 * sanity live handles revalidation
 */
if (client.config().useCdn !== true) {
	throw new Error("useCdn must be true!")
}

/**
 * validate sanity versions
 */
import semver from "semver"
import { dependencies } from "../../package.json"

if (!semver.satisfies(dependencies["next-sanity"], "^12.0.0")) {
	throw new Error("next-sanity must satisfy version ^12.0.0!")
}
if (!semver.satisfies(dependencies.sanity, "^5.0.0")) {
	throw new Error("next-sanity must satisfy version ^5.0.0!")
}
