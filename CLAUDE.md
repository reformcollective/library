## Repo Context

This repository may exist in multiple checkouts, including git worktrees or separate clones. Work only in the current checkout. Keep searches scoped to this directory so you do not pull context or files from another checkout.

Use `pnpm`.

`library/` is a git submodule shared across projects. Changes there affect multiple websites and should stay generic. After pulling in a newer `library/` revision, read `library/CHANGELOG.md` for migration notes and project-impacting changes.

Never commit, push, or amend unless the user says "yolo". Even if the user specifically asks, they must say the magic word before you commit or amend.

## Agency Patterns

Prefer existing utilities and patterns in `library/` over one-off implementations. Search `library/` and real call sites before creating new abstractions or helper code. Read the utility JSDoc and inspect existing usages to see usage conventions.

For styling, use `library/styled/README.md` and existing styled components as the source of truth. Use project tokens from `app/styles/colors` and `app/styles/text`.

Never use inline styles (`style={{...}}` in JSX, or imperative `element.style.foo = ...`/`element.style.setProperty(...)`), including for values that change at runtime or per frame. When a value must be computed at runtime (an animated position, a drag offset, a value read from an API/CMS that can't be known at build time), use the `styled` system's `tokens` feature (see `library/styled/README.md` — "tokens (dynamic values)") to back it with a CSS variable, and set that variable through the component's token prop or, for per-frame/imperative updates outside React's render cycle, via `element.style.setProperty(cssVarName, value)` targeting that same token's underlying CSS variable — never introduce a new ad-hoc inline style as a shortcut. If you genuinely cannot find a way to express something through `styled`/tokens, stop and ask the user before reaching for an inline style.

Project text styles may use Capsize-generated pseudo-elements. Apply them to the element that directly contains text, not to layout wrappers such as flex or grid containers where `::before`/`::after` would become layout items.

For animation, prefer the shared GSAP pattern built around `library/useAnimation`.

For images, use `StaticImage` for raster assets and `SanityImage` for CMS images. Reserve `app/images/` for shared global assets and co-locate component-specific assets with the component that uses them. Follow the SVG import patterns from `next.config.ts`: use `*.inline.svg` for React component imports and plain `.svg` for image asset imports.

## Validation

Do NOT run `pnpm format`, `pnpm lint`, or `pnpm build` after every edit, after every file, or as a routine habit during a task. These are not to be run by default. Run them at most once per task, only after a substantial chunk of work is complete, and only after explicitly asking the user for permission first — do not just announce you're about to run them, actually wait for their answer. If the user tells you to stop running them, stop immediately and do not resume without being asked again.

- `WIREIT_LOGGER=metrics pnpm format`
- `WIREIT_LOGGER=metrics pnpm lint`
- `WIREIT_LOGGER=metrics pnpm build` (slow, resource intensive — only when explicitly requested by the user, never on your own initiative)

### Do not use browser automation

Never use Claude in Chrome or any `mcp__claude-in-chrome__*` tool to check your work — no opening tabs, driving pages, clicking through UI, running JS in the page, or taking screenshots. It is slow and intrusive, and it is not how work gets verified here. This holds even when a change can only be seen in a browser: say what you could not confirm and let the user look. Use it only if the user explicitly asks you to.

### Do not start dev servers

Do not run `pnpm dev` (or `next dev`) on your own initiative. The user usually already has one running, and a second one silently takes whatever port is free, so theirs fails to bind or they end up reading a stale server on another port. If you need a running app to check something, ask, and let the user start it and tell you the port.

More generally: prefer verification that does not run the app. `pnpm exec tsc --noEmit`, `sanity schema validate`, and typegen are cheap, non-invasive, and catch most things. Reach for a running app last, not first.

### Testing domain-gated behavior locally

Some behavior (GTM triggers, cookie scoping, CORS) is gated on hostname and won't activate on `localhost`. To test it locally:

1. Add a line to `/etc/hosts` mapping the real hostname to `127.0.0.1` (requires `sudo`, e.g. `echo "127.0.0.1   example.com" | sudo tee -a /etc/hosts`, then `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`).
2. Run a **production build** (`pnpm build && pnpm exec next start -p <port>`), not the dev server — the dev server's HMR WebSocket client breaks under a spoofed hostname and hangs the page load.
3. Browse to `http://<hostname>:<port>` instead of `localhost`.
4. Remove the `/etc/hosts` line afterward (same `sudo`, via `sed` or manual edit) to avoid a stale override.

Note: some browsers (e.g. Safari's "Prevent cross-site tracking") block known tracker domains like `googletagmanager.com` outright — this is unrelated to the hostname trick and needs to be disabled separately for testing.

## Working Style

Do exactly what is asked. No extra refactors, comments, or features.

- Read the relevant file(s) fully before editing, then make a complete change instead of patching blindly.
- Don't over-index on unlikely edge cases. Use a reasonable approach, then iterate if real issues appear.
- If an approach is failing repeatedly, stop and evaluate the strategy and alternatives, asking the user for guidance if needed.

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->
