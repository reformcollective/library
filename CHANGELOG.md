# 2026-01-12

## Removed outdated patches

Removed patches that are unsafe or no longer needed.

**Migration Advice**

You should update the respective packages to their production versions


# 2026-01-05

## Sanity Version Requirements
The library now strictly enforces Sanity v5 and Next-Sanity v12. It also enforces that useCdn is `true`.

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
Introduced the `withVanillaSplit` Next.js plugin to support the newer styling system. This plugin and the newer styling system rely on Turbopack features only available in **Next.js 16 or greater**.

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
