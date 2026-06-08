## Repo Context

This repository may exist in multiple checkouts, including git worktrees or separate clones. Work only in the current checkout. Keep searches scoped to this directory so you do not pull context or files from another checkout.

Use `pnpm`.

`library/` is a git submodule shared across projects. Changes there affect multiple websites and should stay generic. After pulling in a newer `library/` revision, read `library/CHANGELOG.md` for migration notes and project-impacting changes.

Never auto-commit. Never amend without being asked.

## Agency Patterns

Prefer existing utilities and patterns in `library/` over one-off implementations. Search `library/` and real call sites before creating new abstractions or helper code. Read the utility JSDoc and inspect existing usages to see usage conventions.

For styling, use `library/styled/README.md` and existing styled components as the source of truth. Use project tokens from `app/styles/colors` and `app/styles/text`. Do not use inline styles.

Project text styles may use Capsize-generated pseudo-elements. Apply them to the element that directly contains text, not to layout wrappers such as flex or grid containers where `::before`/`::after` would become layout items.

For animation, prefer the shared GSAP pattern built around `library/useAnimation`.

For images, use `StaticImage` for raster assets and `SanityImage` for CMS images. Reserve `app/images/` for shared global assets and co-locate component-specific assets with the component that uses them. Follow the SVG import patterns from `next.config.ts`: use `*.inline.svg` for React component imports and plain `.svg` for image asset imports.

## Validation

After making changes, run the project validation scripts and fix any warnings or errors they report:

Very fast, run these all the time:

- `WIREIT_LOGGER=metrics pnpm format`
- `WIREIT_LOGGER=metrics pnpm lint`

Slow and very resource intensive, avoid when not needed:

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
