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
import { handleError, SanityLiveRuntime } from "./live.client"

// defineLive internally overrides useCdn per-request (`useCdn = perspective === "published"`),
// making the client-level useCdn: false ineffective. In development, this means published
// content is served from Sanity's API CDN (60s cache) and never updates without webhooks.
// The proxy below intercepts every .fetch() call to force useCdn: false, and chains through
// .withConfig() so the intercept survives defineLive's internal _client.withConfig() call.
type SanityClientLike = typeof client
function makeNoCdnProxy(target: SanityClientLike): SanityClientLike {
	return new Proxy(target, {
		get(t, prop, receiver) {
			if (prop === "fetch") {
				type FetchOptions = Parameters<typeof t.fetch>[2]
				return (query: string, params?: QueryParams, options?: FetchOptions) =>
					Reflect.get(t, prop, receiver).call(t, query, params, {
						...options,
						useCdn: false,
					} as FetchOptions)
			}
			if (prop === "withConfig") {
				return (...args: Parameters<typeof t.withConfig>) =>
					makeNoCdnProxy(Reflect.get(t, prop, receiver).call(t, ...args))
			}
			const value = Reflect.get(t, prop, receiver)
			return typeof value === "function"
				? (value as (...a: unknown[]) => unknown).bind(t)
				: value
		},
	})
}

const libraryClient =
	process.env.NODE_ENV === "development"
		? makeNoCdnProxy(client)
		: client.withConfig({ useCdn: false })

/**
 * Use defineLive to enable automatic revalidation and refreshing of your fetched content
 * Learn more: https://github.com/sanity-io/next-sanity?tab=readme-ov-file#1-configure-definelive
 */
const { sanityFetch: internalFetch, SanityLive: InternalLive } = defineLive({
	client: libraryClient,
	serverToken: token,
	browserToken: token,
	fetchOptions: { revalidate: Infinity },
})

type IsAny<T> = 0 extends 1 & T ? true : false
type UnknownIfAny<T> = IsAny<T> extends true ? unknown : T
type LibraryFetchResult<QueryString extends string> = {
	data: UnknownIfAny<ClientReturn<QueryString>>
	sourceMap: ContentSourceMap | null
	tags: string[]
}

const sanityFetchQuerySizeWarningThresholdBytes = 200 * 1024

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
	const resolvedParams = await params
	const queryBytes = Buffer.byteLength(query)
	const paramsBytes = Buffer.byteLength(JSON.stringify(resolvedParams))
	if (queryBytes > sanityFetchQuerySizeWarningThresholdBytes) {
		console.warn("sanityFetch query size exceeds warning threshold", {
			queryBytes,
			paramsBytes,
			thresholdBytes: sanityFetchQuerySizeWarningThresholdBytes,
		})
	}
	return await internalFetch({
		query,
		params: resolvedParams,
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
				onError={handleError}
				refreshOnFocus={false}
				refreshOnMount={true}
				refreshOnReconnect={true}
				intervalOnGoAway={false}
			/>
		</SanityLiveRuntime>
	)
}

/**
 * validate sanity versions - read actual installed versions from node_modules
 */
if (!semver.satisfies(nextSanityVersion, "^12.0.0")) {
	throw new Error(
		`next-sanity must satisfy version ^12.0.0! (installed: ${nextSanityVersion})`,
	)
}
if (!semver.satisfies(sanityVersion, "^5.0.0")) {
	throw new Error(
		`sanity must satisfy version ^5.0.0! (installed: ${sanityVersion})`,
	)
}
