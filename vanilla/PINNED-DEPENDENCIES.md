# Why this loader pins TypeScript 6 and Vite 7

`vanilla-split-loader.ts` ships as raw TypeScript and is registered as a Turbopack
loader by absolute path in `withVanillaSplit.ts`:

```ts
loader: path.resolve(__dirname, "vanilla-split-loader.ts")
```

Because it is consumed as *source* rather than as a built artifact, it needs the
surrounding build tooling to both parse TS on its behalf and expose the TS
compiler API. Two upstream majors have each removed one of those, so two pins are
in place. They are independent — neither is a workaround for the other.

| Pin | Where | Why |
|---|---|---|
| `typescript@^6.0.3` | `library/package.json` (devDependency) | TS 7 removed the emitter (`createPrinter`, `EmitHint`, `printFile`). Most of the compiler API moved to `typescript/unstable/ast`, but there is no printer replacement, so the loader cannot emit source text at all. Build-time only — projects consuming the library are free to use TS 7. |
| `vite@^7.3.2` | `pnpm-workspace.yaml` (`overrides`) | Vite 8 no longer loads `.ts` files passed by path, so Turbopack handing it this loader fails with "content contains invalid JS syntax". Reached via `@vanilla-extract/turbopack-plugin` → `@vanilla-extract/compiler`, whose peer range `^5 \|\| ^6 \|\| ^7 \|\| ^8` lets pnpm select 8. |

## Gotchas

- The Vite 8 failure surfaces as a **build error blaming `jsx: "preserve"`** in
  `tsconfig.json`. That is a red herring — `preserve` is correct and required for
  Next. The real cause is the loader being handed to Vite as `.ts`.
- `pnpm outdated` does **not** surface either major; it only reports within-range
  updates. They appear only under `pnpm update --latest`.
- Without the Vite override, a fresh clone or any `pnpm update --latest` silently
  re-selects Vite 8 and fails at the first `pnpm dev`.
- Removing either pin requires the fix below, not just a version bump.

## The actual fix

Precompile this loader to JS as part of the library build and register the built
artifact instead of the `.ts` source. That removes the "parse TS for us"
requirement and unblocks Vite 8 immediately.

The TypeScript side needs a separate decision, since the emitter gap is real:

1. **Keep TS 6 as a build-time devDependency** (current state) — works, no runtime
   cost, projects still use TS 7 for their own code.
2. **Replace the printer** with a version-independent emitter. `oxc` is already in
   the stack via oxlint/oxfmt; `ts-morph` and `recast` are alternatives. This is
   the only path off TS 6 before upstream acts, but it swaps the emitter
   underneath ~2,900 lines of code-transforming logic.
3. **Wait** for TS 7 to ship an emitter, then port the AST calls to
   `typescript/unstable/ast` — mechanical, ~177 call sites across four files.

`vanilla-split-loader.test.ts` (108 tests) is a solid safety net for attempting
option 2.

## Verified state

Pins confirmed on `reform-hyphenate` with everything else on latest
(Next 16.3.5, React 19.3, Sanity 6.13, vitest 5): 0 type errors, 108/108 library
tests passing.
