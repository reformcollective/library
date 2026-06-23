## Repo Context

This repository may exist in multiple checkouts, including git worktrees or separate clones. Work only in the current checkout. Keep searches scoped to this directory so you do not pull context or files from another checkout.

Use `pnpm`.

`library/` is a git submodule shared across projects. Changes there affect multiple websites and should stay generic. After pulling in a newer `library/` revision, read `library/CHANGELOG.md` for migration notes and project-impacting changes.

Never commit, push, start a merge/rebase, or amend unless the user says "yolo". Even if the user specifically asks, they must say the magic word before you commit or amend.

## Agency Patterns

Prefer existing utilities and patterns in `library/` over one-off implementations. Search `library/` and real call sites before creating new abstractions or helper code. Read the utility JSDoc and inspect existing usages to see usage conventions.

For styling, use `library/styled/README.md` and existing styled components as the source of truth. Use project tokens from `app/styles/colors` and `app/styles/text`. Do not use inline styles.

Project text styles may use Capsize-generated pseudo-elements. Apply them to the element that directly contains text, not to layout wrappers such as flex or grid containers where `::before`/`::after` would become layout items.

For animation, prefer the shared GSAP pattern built around `library/useAnimation`.

For images, use `StaticImage` for raster assets and `SanityImage` for CMS images. Reserve `app/images/` for shared global assets and co-locate component-specific assets with the component that uses them. For SVGs prefer `*.inline.svg` for React component imports and plain `.svg` for image asset imports.

## Figma Design Matching

Treat Figma as the source of truth unless stated otherwise. Don't guess from screenshots. Pixel values are always scaled (using `f.responsive` or `f.small`) unless stated otherwise.

Before implementing from Figma:
- Inspect whether key visuals are components, instances, variants, vectors, or exportable assets.
- Reuse existing Figma components, styles, variables, and design-system assets before recreating anything.

For icons:
- Export or inspect exact SVG/vector data from Figma; don't approximate.
- Preserve real bounds, strokes, fills, and state variants.
- If exact export is not possible, ask for assets or permission to approximate.

For states and animation:
- Inspect variants, component properties, prototype reactions, and documented state frames.
- If states or animation timing are unclear, ask before coding.

For background graphics and complex visuals:
- Export the exact Figma node/layer; don't recreate it by eye.
- Export PNG assets at 4x scale so `next/image` has quality to optimize from.
- If a high-quality export is not possible, ask for one.

## Common Mistakes

- violating capsize rules around pseudo elements
- using the `css` helper without using a utility like `f.responsive` or `f.unresponsive`
- adding SVGs as react components instead of standalone `*.svg` or `*.inline.svg` files

## Validation

After making changes, check for common mistakes and run the project validation scripts and fix any warnings or errors they report:

Very fast, run these all the time:

- `WIREIT_LOGGER=metrics pnpm format`
- `WIREIT_LOGGER=metrics pnpm lint`

Slow and very resource intensive, run only when needed:

- `WIREIT_LOGGER=metrics pnpm build`

## Working Style

Do exactly what is asked. No extra refactors, comments, or features.

- Read the relevant file(s) fully before editing, then make a complete change instead of patching blindly.
- Don't over-index on unlikely edge cases. Use a reasonable approach, then iterate if real issues appear.
- If an approach is failing repeatedly, stop and evaluate the strategy and alternatives, asking the user for guidance if needed.

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->
