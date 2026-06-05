import { revalidateTag, updateTag } from "next/cache"
import { draftMode } from "next/headers"
import type {
	ClientPerspective,
	ClientReturn,
	ContentSourceMap,
	QueryParams,
} from "next-sanity"
import { defineLive, parseTags } from "next-sanity/live"
import { version as nextSanityVersion } from "next-sanity/package.json"
import { client } from "sanity/lib/client"
import { token } from "sanity/lib/token"
import { version as sanityVersion } from "sanity/package.json"
import semver from "semver"
import { handleError, SanityLiveRuntime } from "./live.client"

const libraryClient = client.withConfig({ useCdn: false })

/**
 * Use defineLive to enable automatic revalidation and refreshing of your fetched content
 * Learn more: https://github.com/sanity-io/next-sanity?tab=readme-ov-file#1-configure-definelive
 */
const { sanityFetch: internalFetch, SanityLive: InternalLive } = defineLive({
	client: libraryClient,
	serverToken: token,
	browserToken: token,
})

async function revalidateLiveTags(unsafeTags: unknown) {
	"use server"

	const { isEnabled: isDraftMode } = await draftMode()
	const { tags } = parseTags(unsafeTags)

	for (const tag of tags) {
		if (isDraftMode) {
			revalidateTag(tag, "max")
		} else {
			updateTag(tag)
		}
	}

	if (isDraftMode) {
		return "refresh"
	}
}

type IsAny<T> = 0 extends 1 & T ? true : false
type UnknownIfAny<T> = IsAny<T> extends true ? unknown : T
type LibraryFetchResult<QueryString extends string> = {
	data: UnknownIfAny<ClientReturn<QueryString>>
	sourceMap: ContentSourceMap | null
	tags: string[]
}

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
}): Promise<LibraryFetchResult<QueryString>> {
	return await internalFetch({
		query,
		params,
		stega: disableStega ? false : undefined,
		perspective,
	})
}

const canUseLiveProxy =
	// vercel has fluid compute baybeeee
	// local obviously is persistent too
	// other providers should be tested and evaluated as needed
	!!process.env.VERCEL || process.env.NODE_ENV === "development"

export const LibraryLive = async () => {
	const { isEnabled: isDraftMode } = await draftMode()
	const useLiveProxy = canUseLiveProxy && !isDraftMode

	return (
		<SanityLiveRuntime isDraftMode={isDraftMode} useLiveProxy={useLiveProxy}>
			<InternalLive
				action={revalidateLiveTags}
				onError={handleError}
				onGoAway={false}
			/>
		</SanityLiveRuntime>
	)
}

/**
 * validate sanity versions - read actual installed versions from node_modules
 */
if (!semver.satisfies(nextSanityVersion, "^13.0.0")) {
	throw new Error(
		`next-sanity must satisfy version ^13.0.0! (installed: ${nextSanityVersion})`,
	)
}
if (!semver.satisfies(sanityVersion, "^5.0.0")) {
	throw new Error(
		`sanity must satisfy version ^5.0.0! (installed: ${sanityVersion})`,
	)
}
