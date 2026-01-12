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




# 2025-10-10

## New Style System & `withVanillaSplit`
Introduced the `withVanillaSplit` Next.js plugin to support the newer styling system.

**Migration Advice**
Wrap your `next.config.ts` with the plugin:
```typescript
import { withVanillaSplit } from "library/vanilla/withVanillaSplit"
export default withVanillaSplit(nextConfig)
```




# 2025-08-20

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
