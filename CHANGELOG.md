# 2026-06-07

## Upgraded to next-sanity 13

`next-sanity` has been upgraded to version 13

Published content revalidation now runs through `library/sanity/liveProxy`. The
proxy keeps a server-owned Sanity Live Content API subscription alive, posts
exact sync-tag invalidations through `/api/live`, refreshes connected browsers,
and broad-revalidates on startup when missed publish events are possible.

Draft mode still renders upstream `SanityLive` so draft previews keep using the
stock next-sanity live behavior.

**Migration Advice**

Rename layout imports/usages from `SanityLive` to `SanityRuntime`:

```tsx
import SanityRuntime, { sanityFetch } from "sanity/lib/live"
```

Keep re-exporting `library/sanity/liveProxy` from `app/(sanity)/api/live/route.ts`.

Include `reformLiveStateType` from `library/sanity/liveState` in the project's Sanity schema types.

## `useHMR` refactor

- `useHMR` now requires `HMRProvider`.
- `"beforeReload"` and `"afterReload"` event types are removed — use `"beforeRefresh"` and `"afterRefresh"` for both cases.
- `useHMR` may fire multiple `afterRefresh` events for each `beforeRefresh`.
- `SteadyHotScroll` moved to `library/SteadyHotScroll`.

## config and script updates

`library/config` now includes shared TypeScript helpers for Oxlint and Oxfmt config.

The starter has also migrated to smarter typegen scripts. AGENTS.md reflects this, so you'll want to pull those from the starter.

**Migration Advice**

Create root-level `oxlint.config.ts` and `oxfmt.config.ts` files that re-export `library/config/oxlint.ts` and `library/config/oxfmt.ts`.

Copy the wireit scripts from the starter. Reference commit: https://github.com/reformcollective/reform-next-starter/commit/648ab8a

# 2026-06-04

## Sanity query size optimizations

Sanity has a 300KB request body limit. To help keep queries below that size, asset metadata projections now use groq functions.

`library/sanity/assetMetadata` now exports `assetMetadataFunctions`, which defines `reform::image`, `reform::images`, `reform::video`, `reform::videos`, `reform::link`, and `reform::links` for use in groq queries.

`libraryFetch` now also warns when a GROQ query passed to `sanityFetch` exceeds 200kb.

**Migration Advice**

Prepend `assetMetadataFunctions` to any query that uses asset functions and update your query to use groq functions directly.

Before:

```ts
import { imageField, linkField, videoField } from "library/sanity/assetMetadata"

const pageQuery = defineQuery(`
	*[_type == "page"][0] {
		${imageField("myImageField")}
		${videoField("myVideoField")}
		${linkField("myLinkField")}

		myImageListField[] {
			...,
			"data": {
				"lqip": asset->metadata.lqip,
				"url": asset->url
			}
		}
	}
`)
```

After:

```ts
import { assetMetadataFunctions } from "library/sanity/assetMetadata"

const pageQuery = defineQuery(`
	${assetMetadataFunctions}

	*[_type == "page"][0] {
		"myImageField": reform::image(myImageField),
		"myVideoField": reform::video(myVideoField),
		"myLinkField": reform::link(myLinkField),

		"myImageListField": reform::images(myImageListField),
		"myVideoListField": reform::videos(myVideoListField),
		"myLinkListField": reform::links(myLinkListField),

		richTextField[] {
			...,
			_type == "inlineImage" => reform::image(@)
		}
	}
`)
```

# 2026-05-20

## Link fields support SMS and document downloads

The shared link resolver and GROQ projection now support the `sms` and `document` link types from `sanity-plugin-link-field` PR 35. `document` links resolve to the uploaded Sanity file asset URL and pass a `download` attribute through `library/link`.

Projects can use the packed PR build at `library/vendor/sanity-plugin-link-field-pr35-91e3ddb.tgz` until upstream publishes a release.

# 2026-05-12

## CI now validates `pnpm test`

The reusable code checks workflow now runs `pnpm test` before building. In starter projects, this exercises the root Wireit `test` target and runs the library test script through `./library:test`.

# 2026-05-08

## Consolidated Sanity live helpers

Sanity live/draft runtime helpers now use a single public entrypoint: `library/sanity/live`.

The old helper-specific imports have been removed:

- `library/sanity/reusableFetch`
- `library/sanity/reusableFetchClient`
- `library/sanity/SanityLiveProxy`
- `library/sanity/SanityPreviewStatusToast`
- `library/sanity/SanityVisualEditingOverlay`
- `library/sanity/FirefoxFix`

`library/sanity/liveProxy` and `library/sanity/disableDraftMode` are still separate because they are route/server helpers.

**Migration Advice**

```ts
// before
import {
	LibraryLive as SanityLive,
	libraryFetch as sanityFetch,
} from "library/sanity/reusableFetch"

// after
import {
	LibraryLive as SanityLive,
	libraryFetch as sanityFetch,
} from "library/sanity/live"
```

Remove any direct imports of `FirefoxFix`, `SanityLiveProxy`, `SanityPreviewStatusToast`, or `SanityVisualEditingOverlay`; those are now internal to `LibraryLive`.

# 2026-05-07

## Image object fit and position are CSS-only

`StaticImage`, `SanityImage`, and `UniversalImage` no longer accept `objectFit` or `objectPosition` props. Set `object-fit` and `object-position` in CSS instead.

`SanityImage` hotspot positioning now reads the rendered `object-fit` value at runtime and only computes hotspot offsets when the computed fit is `cover`. The computed hotspot `object-position` is applied in the library CSS layer, so caller `object-position` CSS overrides it through the cascade.

`SanityImage` now accepts a `quality` prop for Sanity CDN image quality, matching the existing `StaticImage` quality API.

**Migration Advice**

```tsx
// before
;<UniversalImage src={image} objectFit="contain" objectPosition="top center" />

// after
const Image = styled(UniversalImage, [
	f.responsive(css`
		object-fit: contain;
		object-position: top center;
	`),
])
```

# 2026-05-05

## Removed styled utility alias exports

`library/styled` no longer exports the named aliases `fresponsive`, `ftablet`, `fmobile`, or `unresponsive`.

Use the `f` utility object instead.

**Migration Advice**

```ts
// before
import { css, fresponsive, styled, unresponsive } from "library/styled"

fresponsive(css`
	padding: 20px;
`)

unresponsive(css`
	position: fixed;
`)

// after
import { css, f, styled } from "library/styled"

f.responsive(css`
	padding: 20px;
`)

f.unresponsive(css`
	position: fixed;
`)
```

# 2026-05-04

## `compileTime` is now exported from `library/compile-time`

`compileTime` has moved out of `library/styled` because it is not part of the styled API. Import it from `library/compile-time` instead.

The vanilla splitter now requires every `compileTime(...)` call to be awaited. This keeps sync and async build-time values using the same call shape, and prevents async values from being emitted into the bundle before they resolve.

```ts
import { compileTime } from "library/compile-time"

export const syncValue = await compileTime(() => "serialized at build time")
export const asyncValue = await compileTime(async () => {
	return await fetchBuildTimeValue()
})
```

`compileTime` still returns the callback result directly. The required `await` is intentional because awaiting a non-Promise value is a no-op, while awaiting a Promise ensures it resolves before bundling continues.

**Migration Advice**

```ts
// before
import { compileTime, css } from "library/styled"

const value = compileTime(() => "build-time value")

// after
import { compileTime } from "library/compile-time"
import { css } from "library/styled"

const value = await compileTime(() => "build-time value")
```

## Sanity data attribute helper now uses serializable context

`createSanityDataAttribute` has been replaced by `getSanityDataAttribute`.

**Migration Advice**

Attribute context includes document id, type, and a path to the relevant section on the page:

```tsx
const sectionContext = {
	sanityDataAttribute: {
		documentId: relevantPage._id,
		documentType: relevantPage._type,
		pathPrefix: `sections[${index}]`,
	},
}
```

Then update section call sites:

```tsx
import { getSanityDataAttribute } from "library/sanity/getSanityDataAttribute"
;<div data-sanity={getSanityDataAttribute(sanityDataAttribute, "title")} />
```

# 2026-05-01

## Simpler slug resolvers

The library now expects each project `sanity/lib/slug-resolver.ts` to export two project-specific route representations:

- `documentPaths`: JavaScript document-to-path/title rules for already-fetched Sanity documents
- `documentPathProjection`: a GROQ expression that resolves paths at query time

Shared document helper plumbing now lives in `library/sanity/document-helpers`. Project slug resolver files define route behavior, while document helpers provide linkable type extraction, production URL creation, and Presentation location resolution.

**Migration Advice**

Update `sanity/lib/slug-resolver.ts` to this shape:

```ts
import { defineDocumentPaths } from "library/sanity/define-document-paths"

export const documentPaths = defineDocumentPaths({
	page: (document) => ({
		path:
			document.slug?.current === "home" ? "/" : `/${document.slug?.current}`,
		title: document.title ?? "Untitled Page",
	}),
})

export const documentPathProjection = <T>(document: T) =>
	`
	select(
	  !defined(${document}) => null,
		${document}._type == "page" => select(
			${document}.slug.current == "home" => "/",
			"/" + ${document}.slug.current
		)
	)
` as const
```

Update sanity config to import utilities from `library/sanity/document-helpers`

# 2026-04-30

## removed `fetchAssetMeta` / `enrichAssets`

`fetchAssetMeta` and the `enrichAssets` option on `libraryFetch` / `sanityFetch` have been removed. Asset, video, and link metadata should be resolved inline with `assetMetadataFunctions` and direct `reform::image`, `reform::video`, or `reform::link` calls.

**Migration Advice**

See 2026-04-13

# 2026-04-29

## `useHMR` event types renamed; `useSteadyHotScroll` replaced by `SteadyHotScroll`

`useHMR` no longer uses a WebSocket — it hooks into Next.js's internal dispatcher. The event type strings changed and two new types were added:

| Before        | After                    |
| ------------- | ------------------------ |
| `"prebuild"`  | `"beforeRefresh"`        |
| `"postbuild"` | `"afterRefresh"`         |
| —             | `"beforeReload"` _(new)_ |
| —             | `"afterReload"` _(new)_  |

`useSteadyHotScroll` is no longer exported. Use the `SteadyHotScroll` component instead:

```tsx
// before
useSteadyHotScroll()

// after
<SteadyHotScroll />
```

**Migration Advice**

Update any `useHMR` call sites to use the new event type strings. Replace any `useSteadyHotScroll()` hook calls with a rendered `<SteadyHotScroll />` component (imported from `library/useHMR`).

Note that `SteadyHotScroll` MUST be _below_ ScreenContext to work.

# 2026-04-21

## Live proxy now requires POST to be exported

`liveProxy.ts` now exports both `GET` (SSE) and `POST` (revalidation). The POST handler is how the proxy revalidates the Next.js Data Cache in a proper request context — without it, tag revalidation silently does nothing.

**Migration Advice**

If your `app/(sanity)/api/live/route.ts` explicitly forwards only `GET`:

```ts
// before
export { GET } from "library/sanity/liveProxy"
```

Change it to re-export everything:

```ts
// after
export * from "library/sanity/liveProxy"
```

# 2026-04-17

## Removed extra built-in `f.*` utilities

The default `f` utility surface is now limited to:

- `f.responsive`
- `f.unresponsive`
- `f.fullWidth`
- `f.desktop`
- `f.tablet`
- `f.mobile`
- `f.large`
- `f.small`

The older built-ins `f.scaledResponsive`, `f.allFullWidth`, `f.allDesktop`, `f.allTablet`, and `f.allMobile` are no longer provided by default.

If you want additional utilities, add them in `app/libraryConfig.ts` under `utilities`. These custom utilities are merged into the default `f` set.

**Migration Advice**

If you were using the removed built-ins, paste this into `app/libraryConfig.ts` to restore the previous behavior:

```ts
import { defineLibraryConfig } from "library/defaultConfig"

const tabletBreakpoint = "largeMobile" as const

const tabletRule =
	tabletBreakpoint === "tablet"
		? { breakpoint: "tablet", designSize: "tablet", output: "fluid" }
		: { breakpoint: "tablet", designSize: "mobile", output: "pixel" }

export default defineLibraryConfig({
	tabletBreakpoint,
	utilities: {
		scaledResponsive: [
			{ breakpoint: "mobile", designSize: "mobile", output: "fluid" },
			tabletRule,
			{ breakpoint: "desktop", designSize: "desktop", output: "fluid" },
			{ breakpoint: "fullWidth", designSize: "desktop", output: "fluid" },
		],
		allFullWidth: [
			{
				breakpoint: "mobile",
				designSize: "desktop",
				output: "scaleFullyConfig",
			},
			{
				breakpoint: "tablet",
				designSize: "desktop",
				output: "scaleFullyConfig",
			},
			{
				breakpoint: "desktop",
				designSize: "desktop",
				output: "scaleFullyConfig",
			},
			{
				breakpoint: "fullWidth",
				designSize: "desktop",
				output: "scaleFullyConfig",
			},
		],
		allDesktop: [
			{ breakpoint: "mobile", designSize: "desktop", output: "fluid" },
			{ breakpoint: "tablet", designSize: "desktop", output: "fluid" },
			{ breakpoint: "desktop", designSize: "desktop", output: "fluid" },
			{ breakpoint: "fullWidth", designSize: "desktop", output: "fluid" },
		],
		allTablet: [
			{ ...tabletRule, breakpoint: "mobile" },
			{ ...tabletRule, breakpoint: "tablet" },
			{ ...tabletRule, breakpoint: "desktop" },
			{ ...tabletRule, breakpoint: "fullWidth" },
		],
		allMobile: [
			{ breakpoint: "mobile", designSize: "mobile", output: "fluid" },
			{ breakpoint: "tablet", designSize: "mobile", output: "fluid" },
			{ breakpoint: "desktop", designSize: "mobile", output: "fluid" },
			{ breakpoint: "fullWidth", designSize: "mobile", output: "fluid" },
		],
	},
})
```

# 2026-04-16

## Removed legacy styled system

The legacy `restyle`-based styled system has been removed.

`library/styled` is now the canonical entrypoint for the current alpha styled system. `library/styled/alpha` still exists as a temporary compatibility shim, but the old `library/styled/index.tsx` implementation and its dual-system config hooks are gone.

**Migration Advice**

- Remove any app/library config that selects or references the old styling system (`stylingSystem`, `restyle`, or related legacy wiring).
- Treat `library/styled` as the supported import path going forward.
- If you still import `library/styled/alpha`, it will continue to work for now, but you should migrate those imports to `library/styled`.

# 2026-04-13

## `enrichAssets` now opt-in; `fetchAssetMeta` deprecated

`libraryFetch` / `sanityFetch` previously called `fetchAssetMeta` after every query, recursively enriching image refs with LQIP/aspect-ratio data, Mux video refs with playback metadata, and link objects with a resolved `internalSlug`. This happened automatically with no action required.

That behaviour is now **opt-in**. The `enrichAssets` option defaults to `false`. Calls that relied on automatic enrichment will silently receive un-enriched data unless migrated.

**Why**

Post-query enrichment fired N+1 Sanity API calls per render (one per asset ref) and added a lot of render latency, sometimes up to several seconds. Inline GROQ projections resolve the same data in a single round-trip, which is much faster.

**Migration Advice**

For a quick fix, just enable asset enrichment on all your queries.

Long term, replace post-query enrichment with inline GROQ projections in your query. The patterns below cover all enriched field types:

```groq
# Image — adds lqip and aspectRatio under a `data` key
customImage {
  ...,
  "data": {
    "lqip": asset->metadata.lqip,
    "aspectRatio": asset->metadata.dimensions.aspectRatio
  }
}

# Mux video — adds playback metadata under a `data` key
muxVideo {
  ...,
  "data": {
    "playbackId": asset->playbackId,
    "videoThumbnailUrl": "https://image.mux.com/" + asset->playbackId + "/thumbnail.jpg",
    "videoBlurUrl": "https://image.mux.com/" + asset->playbackId + "/thumbnail.webp?time=0&width=32",
    "videoAspectRatio": select(
      defined(asset->data.aspect_ratio) =>
        string::split(asset->data.aspect_ratio, ":")[0] + "/" + string::split(asset->data.aspect_ratio, ":")[1]
    ),
    "videoDuration": asset->data.duration
  }
}

# Link — adds resolved internalSlug
link {
  ...,
  "internalSlug": select(
    type != "internal" => null,
    !defined(internalLink) => null,
    internalLink->._type == "page" => select(
      internalLink->slug.current == "home" => "/",
      internalLink->slug.current
    ),
    internalLink->._type == "product" => "/products/" + internalLink->store.slug.current,
    internalLink->._type == "collection" => "/collections/" + internalLink->store.slug.current
  )
}
```

Once migrated, remove any explicit `enrichAssets: true` from your `sanityFetch` calls. If you cannot migrate a call-site immediately, pass `enrichAssets: true` to preserve the old behaviour — but note that `fetchAssetMeta` is now `@deprecated` and will be removed in a future release.

Note: `CMSLink.internalSlug` has been widened from `string | undefined` to `string | null | undefined` to match the `null` that GROQ `select()` returns on the fallback path.

Note: any app-level helper types still derived from `DeepAssetMeta<Page>` / asset-meta-enriched schema types should be migrated to the actual query result type. In particular, `GetSectionType` should be generated from the real `PageQueryResult["sections"]` union rather than schema-side asset-meta types; otherwise nullability and enriched-field shapes will be too optimistic after the `fetchAssetMeta` deprecation.

## `isRouteDefined` helper — use instead of `!!link`

A new `isRouteDefined(link)` export is available from `library/link`.

**Why**

`sanity-plugin-link-field` writes an `initialValue` of `{ type: "internal", toNewTab: false }` into every link field when a section is first created in Studio. This means the link field is **never** `null` or `undefined` in the database — it always contains at least a partial object, even when the editor has not selected any destination.

As a result, `!!link` is always `true` for these fields and is an unreliable guard for "does this section link anywhere?". Previously, `fetchAssetMeta` resolved an `internalSlug` onto the link object, but that enrichment did not change the object's truthiness or null out links with no destination — the check was subtly broken in both the old and new systems.

`isRouteDefined` fixes this by running the value through `resolveRoute` and checking whether a URL was produced:

```ts
import { isRouteDefined } from "library/link"

// ✓
const hasLink = isRouteDefined(link)

// ✗ — always true; the link object exists even with no destination selected
const hasLink = !!link
```

# 2026-04-07

## Use published vanilla-extract packages

The library now targets the published npm releases of vanilla-extract rather than PR builds.

**Migration Advice**

Remove any `@vanilla-extract/*` overrides and update to the latest published packages.

# 2026-03-24

## `window.lenis` renamed to `window.lenisInstance`

`lenis@1.3.18` introduced a breaking change: `window.lenis` is now a package-owned metadata object (`{ version?, horizontal?, snap? }`) rather than the Lenis scroll instance. This conflicts with the library's `window.lenis?: Lenis` declaration and causes TypeScript errors if you're on `lenis >= 1.3.18`.

**Migration Advice**

Replace all usages of `window.lenis` with `window.lenisInstance` in your project.

# 2026-02-10

## Component.toString returns className with leading period

`Component.toString` now returns the className with a period to align with styled-components, e.g. `".generated-class"`.

**Migration Advice**

Audit your codebases for usage of `toString` or template literals like `` `${MyComponent}` `` to ensure you don't have any usage in the previous format.

## Removed `within` block

The styled API no longer supports the `within` option for scoped child selectors. Use arbitrary selectors inside **string/template styles only** (e.g. `css\`...\``or string entries in`base`/variant arrays).

**Migration Advice**

Replace `within` blocks with selector syntax inside string or template style blocks. Object-style rules only accept vanilla-extract style (camelCase CSS properties); for any descendant or arbitrary selectors, use string/template styles:

```ts
// before (within is removed)
within: {
  "& > *": { marginBottom: 10 },
  "svg": { fill: "currentColor" },
}

// after — use string/template styles only for selectors
base: [
  { display: "grid" },
  css`
    & > * {
      margin-bottom: 10px;
    }
    svg {
      fill: currentColor;
    }
  `,
]
```

# 2026-01-12

## Removed outdated patches

Removed patches that are unsafe or no longer needed.

**Migration Advice**

You should update the respective packages to their production versions

# 2026-01-05

## Sanity Version Requirements

The library now strictly enforces Sanity v5 and Next-Sanity v12.
The library now enforces `useCdn: true`
The `stega` option has been removed and replaced with `disableStega`.

**Migration Advice**
Upgrade your project's Sanity dependencies:

```bash
pnpm add next-sanity@latest sanity@latest
```

# 2025-12-18

## Experimental React Features (`useEffectEvent`)

The library's `useHMR` hook now uses the experimental `useEffectEvent` API. While this is available in React 19, it may require additional type declarations or configuration if your environment doesn't recognize it yet.

**Migration Advice**
Ensure you are on React 19. If you still see type errors, you may need a specific version of `@types/react`.

# 2025-12-17

## Package Version Overrides

The library now requires specific builds of `@vanilla-extract` to support the "split" loading system in Turbopack. These versions are not yet on the main npm registry and must be overridden in your root `package.json`.

**Migration Advice**
Add the following overrides to your root `package.json`:

```json
"pnpm": {
  "overrides": {
    "@vanilla-extract/compiler": "https://pkg.pr.new/RJWadley/vanilla-extract/@vanilla-extract/compiler@edaedbb",
    "@vanilla-extract/css": "https://pkg.pr.new/RJWadley/vanilla-extract/@vanilla-extract/css@edaedbb",
    "@vanilla-extract/integration": "https://pkg.pr.new/RJWadley/vanilla-extract/@vanilla-extract/integration@edaedbb",
    "@vanilla-extract/next-plugin": "https://pkg.pr.new/RJWadley/vanilla-extract/@vanilla-extract/next-plugin@edaedbb",
    "@vanilla-extract/turbopack-plugin": "https://pkg.pr.new/RJWadley/vanilla-extract/@vanilla-extract/turbopack-plugin@edaedbb",
    "@vanilla-extract/webpack-plugin": "https://pkg.pr.new/RJWadley/vanilla-extract/@vanilla-extract/webpack-plugin@edaedbb"
  }
}
```

# 2025-12-12

## Slug Resolvers (`resolveLink`)

The library now requires a link resolver at `sanity/lib/slug-resolver.ts` to handle internal routing logic inside `UniversalLink`.

**Migration Advice**

For older projects, you can use a simple pass-through:

```typescript
export const resolveLink = (item: any) => item?.slug?.current || "/"
```

# 2025-12-11

## TSConfig Paths (`baseUrl` removal)

The library moved away from `baseUrl: "app"` to the modern `"*": ["./*"]` mapping. In the latest version, the library imports your config as `import "app/libraryConfig"`. The library also has moved from `app/library` to `library`.

**Migration Advice**
You should move the library from `app/library` to `library`.

In a perfect world, you would copy the starter's tsconfig. This will require you to update import paths throughout your app, which is likely best handled by a coding agent or find-and-replace.

If this is too large an undertaking, or if several people are working in tandem such that updating all paths is not feasable, you can add paths to your tsconfig as needed by the library:

```json
"paths": {
  "app/*": ["./app/*"]
}
```

# 2025-12-03

## Workflow Input Changes (`runOnGithubActions`)

The library's CI workflows now require the `runOnGithubActions` input. This boolean controls which runner to use (GitHub Actions' `ubuntu-latest` vs Blacksmith's `blacksmith-4vcpu-ubuntu-2204`).

The input `isSanity` has also been removed.

**Migration Advice**
Update your workflow callers to pass the new input:

```yaml
with:
  runOnGithubActions: false # use Blacksmith runners
```

# 2025-11-25

## `BackgroundVideo` File Move

The `BackgroundVideo` component was moved from the `sanity/` directory to a new `videos/` directory within the library.

**Migration Advice**
Update any imports in your project:

```typescript
// Old
import { BackgroundVideo } from "library/sanity/BackgroundVideo"
// New
import { BackgroundVideo } from "library/videos/BackgroundVideo"
```

# 2025-10-10

## Next.js 16 & `withVanillaSplit`

Introduced the `withVanillaSplit` Next.js plugin to support the newer styling system. This plugin and the newer styling system rely on Turbopack features only available in **Next.js 16 or greater**. You'll also need to install `@vanilla-extract/css`

**Migration Advice**
Upgrade to Next.js 16 and wrap your `next.config.ts`:

# 2025-08-20

## Fetching API Renames

To avoid naming conflicts with Sanity's official exports, the library renamed its core fetching utilities.

- `sanityFetch` → `libraryFetch`
- `SanityLive` → `LibraryLive`

**Migration Advice**
The simplest path is to update your `sanity/lib/live.ts` to act as a bridge so you don't have to rename every usage in your app:

```typescript
export {
	libraryFetch as sanityFetch,
	LibraryLive as SanityLive,
} from "library/sanity/reusableFetch"
```

## Grid API Change

### Grid Detail

`makeResponsiveGrid` now requires `sourceDesignWidth` (number) instead of the `scaleFully` (boolean) toggle. It uses this to calculate the max-width of the grid container.

**Migration Advice**
Replace the scalefully option with the corresponding source design sizes in your `layout.tsx` file.

# 2025-06-09

## `SanityLive` Prop Removal

`SanityLive` changed from accepting configuration props to using internal hooks (`useDraftModeEnvironment`, `useIsPresentationTool`) to determine its state.

**Migration Advice**
Remove any props passed to `<SanityLive />` in your `layout.tsx`.
