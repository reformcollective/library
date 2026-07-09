import libraryConfig from "app/libraryConfig"
import { siteURL } from "library/siteURL"
import { draftMode } from "next/headers"
import type {
	ClientPerspective,
	ClientReturn,
	ContentSourceMap,
	QueryParams,
} from "next-sanity"
import { defineLive } from "next-sanity/live"
import { version as nextSanityVersion } from "next-sanity/package.json"
import { client } from "sanity/lib/client"
import { token } from "sanity/lib/token"
import { version as sanityVersion } from "sanity/package.json"
import semver from "semver"
import { notifySanityLiveRefreshAction, RuntimeClient } from "./live.client"
import {
	getLiveProxySupport,
	getLiveProxyUnsupportedMessage,
	isNextProductionBuild,
} from "./liveEnvironment"

const libraryClient = client.withConfig({ useCdn: true })

/**
 * Use defineLive to keep Sanity fetches tagged with Content Lake sync tags.
 * Learn more: https://github.com/sanity-io/next-sanity?tab=readme-ov-file#1-configure-definelive
 */
const { sanityFetch: internalFetch, SanityLive: InternalLive } = defineLive({
	client: libraryClient,
	serverToken: token,
	browserToken: token,
})

type IsAny<T> = 0 extends 1 & T ? true : false
type UnknownIfAny<T> = IsAny<T> extends true ? unknown : T
type LibraryFetchResult<QueryString extends string> = {
	data: UnknownIfAny<ClientReturn<QueryString>>
	sourceMap: ContentSourceMap | null
	tags: string[]
}

const sanityFetchQuerySizeWarningThresholdBytes = 200 * 1024

type LibraryFetchArgs<QueryString extends string> = {
	query: QueryString
	params?: QueryParams | Promise<QueryParams>
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
}

function warnIfQueryTooLarge(query: string, resolvedParams: QueryParams) {
	const queryBytes = Buffer.byteLength(query)
	const paramsBytes = Buffer.byteLength(JSON.stringify(resolvedParams))
	if (queryBytes > sanityFetchQuerySizeWarningThresholdBytes) {
		console.warn("sanityFetch query size exceeds warning threshold", {
			queryBytes,
			paramsBytes,
			thresholdBytes: sanityFetchQuerySizeWarningThresholdBytes,
		})
	}
}

/**
 * Used to fetch published content in Server Components. Cached via `"use cache"` and revalidated
 * on-demand via Sanity's live event tags — since cache boundaries can't read `draftMode()`/`cookies()`
 * themselves, this always fetches with the "published" perspective. For drafts/preview, use
 * `libraryFetchDynamic` instead, resolving the perspective in an uncached caller first
 * (e.g. via `draftMode()` or `resolvePerspectiveFromCookies` from `next-sanity/live`).
 */
export async function libraryFetch<const QueryString extends string>({
	query,
	params = {},
	disableStega,
}: LibraryFetchArgs<QueryString>): Promise<LibraryFetchResult<QueryString>> {
	"use cache"
	const resolvedParams = await params
	warnIfQueryTooLarge(query, resolvedParams)
	return await internalFetch({
		query,
		params: resolvedParams,
		stega: disableStega ? false : undefined,
		perspective: "published",
	})
}

/**
 * TEMP TEST (option A): wrapped in "use cache" per next-sanity's documented Cache Components
 * pattern. Call this from an uncached component (not marked `"use cache"`) after resolving
 * `perspective` yourself, typically only when `draftMode()` is enabled.
 */
export async function libraryFetchDynamic<const QueryString extends string>({
	query,
	params = {},
	perspective,
	disableStega,
}: LibraryFetchArgs<QueryString> & {
	perspective: Exclude<ClientPerspective, "raw">
}): Promise<LibraryFetchResult<QueryString>> {
	"use cache"
	const resolvedParams = await params
	warnIfQueryTooLarge(query, resolvedParams)
	return await internalFetch({
		query,
		params: resolvedParams,
		stega: disableStega ? false : undefined,
		perspective,
	})
}

export const LibraryRuntime = async () => {
	const { isEnabled: isDraftMode } = await draftMode()
	const isProductionBuild = isNextProductionBuild()
	const { allowProxy, canUseLiveProxy, runtimeSupportsLiveProxy } =
		getLiveProxySupport({
			allowProxy: libraryConfig.allowProxy,
			currentSiteURL: siteURL,
		})
	if (allowProxy && !runtimeSupportsLiveProxy && !isProductionBuild) {
		throw new Error(getLiveProxyUnsupportedMessage())
	}

	return (
		<RuntimeClient
			isDraftMode={isDraftMode}
			useLiveProxy={canUseLiveProxy && !isProductionBuild}
		>
			{(isDraftMode || !allowProxy) && (
				<InternalLive
					action={isDraftMode ? notifySanityLiveRefreshAction : undefined}
				/>
			)}
		</RuntimeClient>
	)
}

if (!semver.satisfies(nextSanityVersion, "^13.0.0")) {
	throw new Error(
		`next-sanity must satisfy version ^13.0.0! (installed: ${nextSanityVersion})`,
	)
}
if (!semver.satisfies(sanityVersion, "^5.0.0 || ^6.0.0")) {
	throw new Error(
		`sanity must satisfy version ^5.0.0 || ^6.0.0! (installed: ${sanityVersion})`,
	)
}
