import { draftMode } from "next/headers"
import type {
	ClientPerspective,
	ClientReturn,
	ContentSourceMap,
	QueryParams,
	SanityClient,
} from "next-sanity"
import { defineLive } from "next-sanity/live"
import { version as nextSanityVersion } from "next-sanity/package.json"
import { client } from "sanity/lib/client"
import { token } from "sanity/lib/token"
import { version as sanityVersion } from "sanity/package.json"
import semver from "semver"
import { handleError, SanityLiveRuntime } from "./live.client"

// defineLive recalculates useCdn from perspective (true when "published"), ignoring the
// client-level useCdn setting. This proxy intercepts withConfig and fetch to force
// useCdn: false so all fetches go to api.sanity.io instead of apicdn.sanity.io.
function withForcedNoCdn(c: SanityClient): SanityClient {
	return new Proxy(c, {
		get(target, prop) {
			if (prop === "withConfig") {
				return (cfg: Parameters<SanityClient["withConfig"]>[0]) =>
					withForcedNoCdn(target.withConfig({ ...cfg, useCdn: false }))
			}
			if (prop === "fetch") {
				return (
					query: string,
					params: Parameters<typeof target.fetch>[1],
					opts: Record<string, unknown> = {},
				) => {
					const url = target.getUrl(query, false)
					console.log(
						"[sanity] fetch via",
						new URL(url).hostname,
						"| useCdn forced false",
					)
					return target.fetch(query, params, { ...opts, useCdn: false })
				}
			}
			// Private class fields (#clientConfig etc.) are only accessible on the real instance.
			// Using target as receiver and binding functions ensures `this` is never the Proxy.
			const value = Reflect.get(target, prop, target)
			return typeof value === "function"
				? (value as Function).bind(target)
				: value
		},
	})
}

/**
 * Use defineLive to enable automatic revalidation and refreshing of your fetched content
 * Learn more: https://github.com/sanity-io/next-sanity?tab=readme-ov-file#1-configure-definelive
 */
const { sanityFetch: internalFetch, SanityLive: InternalLive } = defineLive({
	client:
		process.env.NODE_ENV === "development" ? withForcedNoCdn(client) : client,
	serverToken: token,
	browserToken: token,
	fetchOptions:
		process.env.NODE_ENV === "development" ? {} : { revalidate: Infinity },
})

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
				onError={handleError}
				refreshOnFocus={false}
				refreshOnMount={false}
				refreshOnReconnect={true}
				intervalOnGoAway={false}
			/>
		</SanityLiveRuntime>
	)
}

/**
 * sanity live handles revalidation
 */
// if (client.config().useCdn !== true) {
// 	throw new Error("useCdn must be true!")
// }

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
