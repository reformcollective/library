# Reform agent rules

These rules are locked. Only a rule owner changes them, through a reviewed library PR. If one looks wrong, say so to the developer and keep following it.

## Repo

- Work only in this checkout, or in the worktree your brief names; keep searches inside it. Use `pnpm`.
- `library/` is a submodule shared by every project. Keep changes there generic. Project-specific logic never goes in `library/`.
- After a library bump, read only the new entries: `git diff <old>..<new> -- library/CHANGELOG.md`.
- This Next.js is newer than your training. Before Next.js work, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecations.
- Never read `docs/archive/`; it is out of date.
- Generated files (`sanity.types.ts`, `schema.json`, `pnpm-lock.yaml`): search them for the one name you need, never read them whole.

## Scope

- Do what was asked, at the scope asked. No extra refactors, features, tests or docs. Mention anything else at the end.
- Read the files you change fully before editing. Search `library/` and real call sites before writing a helper; read the JSDoc.
- If an approach fails twice, stop and say what you tried.
- If something can only be judged by eye (motion feel, "does it look right"), say what you could not confirm. Never claim it looks good.

## Conventions

- Styling: follow `library/styled/README.md`. Tokens from `app/styles/colors` and `app/styles/text`.
- No inline styles: never `style={{}}` or `element.style` (including `setProperty`). A runtime value is a token prop on the styled component. In animation code it is GSAP (`gsap.set`, `gsap.to`). If neither fits (a third-party integration that requires it), tell the developer why. Never disable the rule yourself; only a person can.
- Capsize text styles go on the element that directly holds the text, never on a flex or grid wrapper.
- Breakpoints: start from `f.responsive` (the desktop design, scaled down for tablet landscape) with overrides in `f.small` (the mobile design, scaled up for tablet portrait). Use `f.mobile`, `f.tablet`, `f.desktop`, `f.large` or `f.fullWidth` only when `f.responsive` and `f.small` cannot get a breakpoint right, and say in your report what went wrong without it. The `css` helper always uses one of these.
- Figma pixel values are always scaled (`f.responsive` or `f.small`) unless stated otherwise.
- Animation: the shared GSAP pattern around `library/useAnimation`.
- Images: `StaticImage` for raster, `SanityImage` for CMS. Shared assets in `app/images/`, component assets beside the component.
- SVGs: `*.inline.svg` for React components, plain `.svg` for images. Always start from the Figma export; never draw one from scratch. Adjusting an exported SVG is fine: say in your report which Figma node it came from and what you changed.
- Types: Sanity-inferred. No `any`; casts only at documented mismatches or external API boundaries.
- React Compiler: compute `??`, `?.`, ternaries and template literals into variables above a `try`, never inside it.

## Comments

Write a comment only when the code cannot say it: a non-obvious why, a browser bug workaround, where a magic number comes from. One line, two at most. Never write what the code does, how you got here, what changed, options you rejected, or notes to anyone. Never mention AI or Claude. JSDoc only on exported library functions: one sentence, plus params if not obvious.

Good:

```ts
// Safari reports 0 height until the video's metadata loads
const TABLET = 768 // Figma "Tablet" frame width
```

Bad:

```ts
// We use a ref here instead of state because state would trigger a re-render,
// which previously caused the animation to restart. This ensures that...
```

## Checking your work

- When the work is done, run `WIREIT_LOGGER=metrics pnpm lint` once and fix what it reports. It is also the type check. Do not run `pnpm format`; the pre-commit hook formats.
- After each edit, hooks run the comment check and the real React Compiler on that file. Fix what they report before moving on; never work around them.
- Prefer checks that do not run the app: `pnpm exec tsc --noEmit`, `sanity schema validate`, typegen.
- Browser: only headless Playwright, on your own dev server on a port from 4100 to 4199, stopped when you are done. Never the developer's port, never Claude in Chrome, never their browser. Never run `pnpm build` unless asked.
- Review: for multi-file changes, new sections or components, anything in `library/`, Sanity schema or GROQ, or animation logic, spawn the `reviewer` subagent once lint passes, giving it the request and the commit range. Use model `opus` for `library/`, schema or animation changes; its default otherwise. Do not pass it your reasoning. Fix bugs, missed requirements and convention breaks; ignore style preferences. One round. Report what you fixed and what you rejected, with a reason, and pass the reviewer's "Breakpoint helpers to confirm" and "SVGs to confirm" lists to the developer word for word.

## Git

- Commit on any branch except `main` and `staging`, after the checks pass, one step (a section, a schema, a card) per commit.
- Make a branch with `git switch -c <name>`. `git checkout`, `git restore`, `git stash` and `git rebase` are blocked.
- Push feature branches and open PRs when asked. Never rebase, amend or force push. Never merge a PR or merge into `main` or `staging`; a person does that. One exception: in a parallel pass the main session merges a builder's branch into the page branch with `git merge --no-ff`, after that section's checks and review pass. The developer approves each merge.
- No AI attribution anywhere: no Co-Authored-By trailers, no "Generated with" lines, no mention of Claude or AI in commits, PRs, comments or app text.

## APIs

- Read any API you need, in any step: Vercel, Slack, Notion, Sanity and third-party APIs.
- Change Vercel, Slack or Notion only through their connector; it asks the developer first. The `vercel` command line is blocked.
- Other APIs (curl, scripts): read freely. Ask the developer in chat before anything that sends or changes data.
- Sanity: change and publish freely while the project notes say `Live: no`. Once they say `Live: yes`, ask in chat before any Sanity change or publish.
- Builders and reviewers never change an API. Put what needs changing in the report.

## Subagents and cleanup

- Start only `reviewer`, `builder` or a read-only search agent. Never a general agent that writes.
- Every builder brief names: the one job and the spec or card it comes from; the worktree, branch, port and the files it may change (everything else is read-only); what done looks like and how to check it; the report path, `~/.reform/reports/<project>/<page>/<section>.md`; a time box.
- Before your final reply, delete what you made: screenshots, scratch copies, temp folders. Stop your dev server. Never delete what you did not make.
- Temp folders go under `$TMPDIR/reform-<project>-*`. A session-start hook removes ones untouched for 24 hours, builder worktrees that are merged and clean, and reports older than 14 days.

## Sessions

- End every reply with the context line a hook gives you each turn (`Context: N% (...)`), exactly as given. If there is none, leave the line out. Never estimate it or write a placeholder.
- At 40%, finish the step and rewrite `STATE.local.md` (state only, 25 lines max): the date and head commit; done this session; in progress; the next three things; waiting on someone. Then tell the developer it is time to clear.
