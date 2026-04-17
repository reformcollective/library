# Reform Next Starter — Claude Notes

## Project

Marketing site starter built by Reform Collective. Next.js app router, Sanity CMS, TypeScript.

## Package Manager

`pnpm` only. Never use npm or yarn.

## Styling System

Import `css`, `f`, `styled` from `"library/styled"`.

`css` is just `String.raw` — a tagged template literal for CSS strings.

`styled(tag, [StyleRules])` wraps any HTML tag or component with scoped styles. Always use the array `[]` form. this can be either the standard array form or the version using base: []. Always wrap CSS with an `f.*` function — never pass a bare `css` string directly unless specifically asked by the human.

`f` converts px values from the design file into fluid responsive values automatically. Available utilities:

- `f.responsive` — all breakpoints (mobile → tablet → desktop → fullWidth). Use this by default.
- `f.unresponsive` — passes CSS through with no transformation
- `f.fullWidth` — full width only
- `f.small` — mobile + tablet only
- `f.large` — desktop + fullWidth only
- `f.desktop` / `f.tablet` / `f.mobile` — single breakpoint

If you need extra `f.*` utilities beyond that default set, define them in `app/libraryConfig.ts` under `utilities`.

Write px values as they appear in Figma — the system converts them. Styled components go at the bottom of the file.

Colors: `import { colors } from "app/styles/colors.css"` → use as `${colors.blog1Evergreen800}`
Text styles: `import textStyles from "app/styles/text"` → use as `${textStyles.p4}`

Never use inline styles.

Always use modern CSS color notation: `rgb(0 0 0 / 80%)` — never `rgba(0, 0, 0, 0.8)` or `rgba`.

## useMedia

`import { useMedia } from "library/useMedia"`

Argument order: `useMedia(fullWidth, desktop, tablet, mobile)`

`f.small` encompasses mobile + tablet. `useMedia(false, false, true, true)` is the JS equivalent — anything styled with `f.small` behaves the same across both breakpoints (mobile values are scaled up proportionally on tablet). So a single `responsive = useMedia(false, false, true, true)` check is sufficient to branch between desktop and f.small behavior.

## Animations (GSAP)

- `import { useAnimation } from "library/useAnimation"`
- Register plugins at file top: `gsap.registerPlugin(MorphSVGPlugin)`
- `useAnimation(createFn, deps, options?)` — handles context, cleanup, HMR, Lenis integration
  - `createFn` receives `{ context, contextSafe }` — use `contextSafe` to wrap GSAP event handlers
  - Return a cleanup function from `createFn` for event listeners and manual kills
  - `options.scope` — `RefObject<Element>` for GSAP context scope
  - `options.recreateOnResize` — recreate animations on resize
  - `options.updateBehavior` — `"kill" | "revert" | "none"` (default: `"revert"`)
  - `options.unmountBehavior` — `"kill" | "revert" | "none"` (default: `"kill"`)
- Only runs client-side after hydration — safe to use refs directly

## Components

- `"use client"` required for any file using GSAP, refs, or event listeners
- `.inline.svg` files are imported as React components via SVGR
- Raster images use `StaticImage` from `"library/StaticImage"`
- The `images/` alias (`app/images/`) is for global assets only — brand marks, icons, SVGs used across multiple components
- Component-specific images live next to the component: convert `Hero.tsx` to `Hero/index.tsx` and place images alongside it (or in `Hero/images/` if there are many). Import them with relative paths.

## Library

`library/` is a git submodule shared across projects. We have full control over it and can make changes via PRs. Be careful when modifying it since changes affect other projects, but don't treat it as off-limits.

## Linter

`oxfmt` runs on save and may reformat files. Always re-read a file before editing if it may have changed since the last read.

## Editing Files

This codebase uses tabs for indentation. The Edit tool's `old_string` matching is sensitive to exact whitespace. If an Edit fails to match, use Write to rewrite the whole file rather than retrying with adjusted indentation — retrying Edit rarely works and wastes time.

## Git

Never auto-commit. Never amend without being asked.

## Working Style

Do exactly what is asked. No extra refactors, comments, or features. Implement directly when asked — don't restate the plan first.

- If confidence in a solution is below ~100%, say so upfront. Don't spend tokens on an approach that likely won't work — ask a clarifying question or flag the uncertainty first.
- Prefer attempting a solution and iterating based on real results over pre-emptive "but what if..." hedging. Try it, then adjust.
- Before using any existing component, grep for real call sites in the codebase and read one — don't rely solely on the component definition. The definition shows what props exist; actual usage shows the correct calling convention.

## Blog Templates

This starter contains multiple blog template presets housed in `app/(blog-templates)/(blog-template-1)/[blogSlug]/`, etc. and matching Sanity schemas in `sanity/schemas/blog/blog-1/`, etc.

The public URL for each blog is driven by the hub singleton slug in Sanity — no route folder renaming is needed.

Full adoption instructions are in `sanity/schemas/blog/blog-1/README.md`.

**To adopt a template for a project:**

1. Set the hub slug in Sanity Studio — this controls the public URL
2. Replace `blog1*` placeholder colors in `app/styles/colors.css.ts` with project brand colors
3. Update the grid values in `app/(blog-templates)/(blog-template-1)/[blogSlug]/layout.tsx` to match the design
4. Delete unused template folders under `app/(blog-templates)/` and `sanity/schemas/blog/`

## Image Co-location

The `app/images/` folder (aliased as `images/*`) is for **global assets only** — brand marks, icons, and SVGs used across multiple components.

Images that belong to a specific component or section should live next to that component, not in `app/images/`.

### Structure

If a component or section has its own images, convert it from a single file to a folder:

```
sections/
  Hero/
    index.tsx        ← was Hero.tsx
    hero-bg.jpg      ← co-located image
    diagram.svg

  Sample.tsx         ← no images, stays a single file
```

If a component needs many images, group them in an `images/` subfolder:

```
sections/
  Hero/
    index.tsx
    images/
      bg-desktop.jpg
      bg-mobile.jpg
      diagram.svg
```

### Importing

Co-located images use relative imports:

```ts
import HeroBg from "./hero-bg.jpg"
import HeroBg from "./images/bg-desktop.jpg"
```

Global images use the `images/` alias:

```ts
import LogoMark from "images/LogoMark.svg"
import ArrowIcon from "images/icons/Arrow.inline.svg"
```

## Sanity Image Queries

Any image field in a GROQ query that will be rendered with `SanityImage` / `UniversalImage` must include an inline `data` projection for LQIP and aspect ratio. `enrichAssets` defaults to `false` — do not rely on post-query enrichment.

```groq
mainImage {
  ...,
  "data": {
    "lqip": asset->metadata.lqip,
    "aspectRatio": asset->metadata.dimensions.aspectRatio
  }
}
```

This applies to every image field in every query — `mainImage`, `image`, `photo`, etc. — wherever the result is passed to `SanityImage` / `UniversalImage`.

If inline projection is not feasible for a specific call-site, you can opt into legacy post-query enrichment as a temporary measure by passing `enrichAssets: true` to `sanityFetch`. This is deprecated and should not be used for new code.

```ts
const { data } = await sanityFetch({ query, enrichAssets: true })
```
