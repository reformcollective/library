# Why this loader blocks toolchain upgrades

`vanilla-split-loader.ts` ships as raw TypeScript and is registered as a Turbopack
loader by absolute path in `withVanillaSplit.ts`:

```ts
loader: path.resolve(__dirname, "vanilla-split-loader.ts")
```

Because it is consumed as *source* rather than as a built artifact, it needs the
surrounding build tooling to both parse TS on its behalf and expose the TS compiler
API. Three upstream majors have each removed one of those. Nothing is pinned to work
around this today — the update was attempted on `reform-hyphenate` and reverted, so
versions are simply what the committed lockfile resolves.

| Dependency | How it breaks | Known-good |
|---|---|---|
| **TypeScript 7** | Removed the emitter (`createPrinter`, `EmitHint`, `printFile`). Most of the compiler API moved to `typescript/unstable/ast`, but there is no printer replacement, so the loader cannot emit source text at all. | 6.x |
| **Vite 8** | No longer loads `.ts` files passed by path, so Turbopack handing it this loader fails with "content contains invalid JS syntax". Reached via `@vanilla-extract/turbopack-plugin` → `@vanilla-extract/compiler`, whose peer range `^5 \|\| ^6 \|\| ^7 \|\| ^8` lets pnpm select 8. | 7.x |
| **@swc/core 1.16** | Panics parsing the loader: `NoFileFor(BytePos(..))` in `swc_common/src/source_map.rs`. Reached via the same turbopack-plugin dependency. | 1.15.x |

## Gotchas

- The Vite 8 failure surfaces as a **build error blaming `jsx: "preserve"`** in
  `tsconfig.json`. That is a red herring — `preserve` is correct and required for Next.
- `pnpm outdated` does **not** surface any of these; it only reports within-range
  updates. They appear only under `pnpm update --latest`.
- All three are reached through build tooling, not app code, so they do not affect what
  a project ships — only whether it can build.

## The actual fix

Precompile this loader to JS as part of the library build and register the built
artifact instead of the `.ts` source. That removes the "parse TS for us" requirement and
unblocks both Vite 8 and SWC 1.16.

The TypeScript side needs a separate decision, since the emitter gap is real:

1. **Keep TS 6 as a build-time devDependency** — works, no runtime cost, projects are
   free to use TS 7 for their own code.
2. **Replace the printer** with a version-independent emitter. `oxc` is already in the
   stack via oxlint/oxfmt; `ts-morph` and `recast` are alternatives. This is the only
   path off TS 6 before upstream acts, but it swaps the emitter underneath ~2,900 lines
   of code-transforming logic.
3. **Wait** for TS 7 to ship an emitter, then port the AST calls to
   `typescript/unstable/ast` — mechanical, ~177 call sites across four files.

`vanilla-split-loader.test.ts` (108 tests) is a solid safety net for attempting option 2.
