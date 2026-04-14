
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

The styled API no longer supports the `within` option for scoped child selectors. Use arbitrary selectors inside **string/template styles only** (e.g. `css\`...\`` or string entries in `base`/variant arrays).

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
  runOnGithubActions: false  # use Blacksmith runners
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
```typescript
import { withVanillaSplit } from "library/vanilla/withVanillaSplit"
export default withVanillaSplit(nextConfig)
```


# 2025-08-20

## Fetching API Renames
To avoid naming conflicts with Sanity's official exports, the library renamed its core fetching utilities.

*   `sanityFetch` → `libraryFetch`
*   `SanityLive` → `LibraryLive`

**Migration Advice**
The simplest path is to update your `sanity/lib/live.ts` to act as a bridge so you don't have to rename every usage in your app:
```typescript
export { libraryFetch as sanityFetch, LibraryLive as SanityLive } from "library/sanity/reusableFetch"
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
