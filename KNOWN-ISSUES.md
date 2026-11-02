# Known issues

Open upstream problems that affect library consumers, with the workaround in use and what to re-check. Newest first. Remove an entry once it is fixed and the workaround is dropped, and note the removal in `CHANGELOG.md`.

## vanilla-extract compiler on vite 8 fails under jsx: preserve

**Status:** open. **Last checked:** 2026-10-26.

**Symptom:** dev or build fails from `vanilla/vanilla-split-loader.ts` with "Failed to parse source for import analysis because the content contains invalid JS syntax. If you use tsconfig.json, make sure to not set jsx to preserve."

**Cause:** `@vanilla-extract/turbopack-plugin` 0.1.4 added an esbuild peer, which made pnpm resolve `@vanilla-extract/compiler`'s vite peer to vite 8.1.0 instead of 7.3.2. Vite 8's oxc transform leaves JSX unparsed under `tsconfig` `jsx: preserve` (required by Next), and the compiler imports `styled/runtime.tsx`, which contains JSX.

**Workaround (in use in the starter):** add to the site's `pnpm-workspace.yaml`:

```yaml
overrides:
  "@vanilla-extract/compiler>vite": 7.3.2
```

The library floor for `@vanilla-extract/turbopack-plugin` stays at `^0.1.3`, which already admits 0.1.4. Any site whose lockfile resolves 0.1.4 or later needs the override until this is resolved.

**Rejected:** patching `createCompiler` in `vanilla/vanilla-split-loader.ts` to pass oxc `jsx: automatic`. It worked in a scratch repro but is a brittle monkeypatch of a dependency's exports.

**Investigation:** the plugin hardcodes the compiler's vite config, so a site cannot change it. Running the real plugin loader on a generated `layout.css.tsx` with vite 8.1.0 fails with the error above. The same call with `oxc: { jsx: { runtime: "automatic" } }` added to the compiler's `viteConfig` succeeds, which points at oxc and `jsx: preserve` as the cause. With the vite 7.3.2 override it also passes. No full `next dev` or `next build` was run.

**Upstream, as of 2026-10-26:**

- No planned fix found. No canary releases.
- `@vanilla-extract/compiler` latest 0.7.2 (2026-07-14) allows `vite` `^5 || ^6 || ^7 || ^8`.
- `@vanilla-extract/turbopack-plugin` latest 0.1.4 (2026-08-27).
- vanilla-extract has no issue or PR about `jsx: preserve`. Vite 8 support landed in #1687.
- rolldown/rolldown#11198 (opened 2026-10-13) says the jsx preserve workaround no longer works because `vite:oxc` is native on Vite 8.3.4.
- vitejs/vite#23875 (jsx preserve in the dep scanner) was closed unmerged on 2026-10-23. The maintainer pointed to the plugin side, vitejs/vite#22057.
- Not independently reproduced beyond the scratch repro above.

**How to tell it is fixed, and what to re-check:**

- Periodically check the upstream links above and new `@vanilla-extract/compiler` and `@vanilla-extract/turbopack-plugin` releases.
- To test, remove the override in a scratch install and run the dev server or the loader repro. If it passes, drop the override and raise the library floor for the plugin.
- See also `vanilla/PINNED-DEPENDENCIES.md`, which covers the same vite 8 failure from the dependency-pinning side.
