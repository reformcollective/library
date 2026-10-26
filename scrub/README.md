# scrub

Scroll-scrubbed clips drawn to a canvas. Scrubbing a `<video>`'s `currentTime` stops repainting on Safari once the tab has been in the background, so neither component uses a `<video>`.

| | source | extra dependency |
|---|---|---|
| `ScrubbedVideo` | one `.fsv` file | `@plutotcool/fsv` (optional peer) |
| `ScrubbedImageSequence` | numbered image frames | none |

Both take the same scroll props, so a section can swap between them. Import by file (there is no barrel):

```tsx
import { ScrubbedVideo } from "library/scrub/ScrubbedVideo"
import { ScrubbedImageSequence } from "library/scrub/ScrubbedImageSequence"
```

They fill their parent (`100% x 100%`, `pointer-events: none`), so give the parent a size. Typically it is a sticky stage inside a tall track, and the track is the `trigger`:

```tsx
const track = useRef<HTMLDivElement>(null)

<Track ref={track}>{/* e.g. height: 400vh */}
	<Stage>{/* position: sticky; top: 0; height: 100vh */}
		<ScrubbedVideo src="/clip.fsv" trigger={track} alt="..." />
	</Stage>
</Track>
```

The top of the trigger (`start`, default `"top top"`) shows the first frame, the bottom (`end`, default `"bottom bottom"`) the last. Loading is client only; the server renders an empty canvas.

## Props shared by both

| prop | |
|---|---|
| `trigger` | ref to the element whose scroll drives the frames. required |
| `enabled` | `false` loads nothing, for a layout hidden at this size. default `true` |
| `start`, `end` | ScrollTrigger positions |
| `scrub` | seconds of lerp between scroll and frame (ScrollTrigger's `scrub`). default `1` |
| `scrubFrom` | frame number scroll starts from; the frames before it are for something else to play (see Control) |
| `progressCurve` | remaps scroll progress 0-1 to the share of the clip shown 0-1, for holds and speed ramps. may be inline |
| `controlRef` | see Control |
| `fit` | `cover` (default), `contain`, `fill`, as object-fit |
| `alt` | makes the canvas `role="img"`; without it the canvas is `aria-hidden` |
| `onReady` | the first frame is on screen |
| `className` | on the wrapper |
| `settle`, `settleThreshold`, `springStiffness`, `springDamping` | advanced, below |

Callbacks and `progressCurve` can be inline functions; changing them never rebuilds the animation or reloads frames.

### ScrubbedVideo

`src` (the `.fsv` url), `alpha` (video with an alpha track; loaded whole instead of streamed), `priorityFrames` (frames needed before the first draw and `onReady`, default `1`, capped at the clip's frame count and ignored with `alpha`; the rest stream in and scrubbing past them holds the last frame), `onLoaded` (every frame in), `onError` (fetch or decode failure; without it the error is `console.error`ed and the canvas stays blank).

There is no poster, reduced-motion or unsupported-browser fallback (needs WebCodecs and WebGL2); that is left to the site.

### ScrubbedImageSequence

`basePath`, `digits` (default `4`), `firstFrame` (default `1`), `lastFrame`, `ext` (default `"avif"`). Frame `n` is `${basePath}${pad(n, digits)}.${ext}`.

Frames load in bisection order (first, last, midpoints, ...), so the whole clip is scrubbable coarsely after a few frames, and the nearest loaded frame is drawn until the exact one arrives (no cross-fade). Extra props: `priority: { to, step }` (load every `step`th frame up to `to` first, for a clip played from its start), `onPriorityLoaded`, `onProgress(loaded, total)`.

Frames are drawn as `HTMLImageElement`s, not `ImageBitmap`s, on purpose: bitmaps hold decoded pixels (~2 MB each at 1080p), which adds up to hundreds of MB on a long clip and kills iOS tabs.

## Control: play something else, then hand over to scroll

`createSequenceControl()` returns `{ held, index, draw, release }`. Pass it as `controlRef`. While `held` is true scroll draws nothing and you call `draw(index)` (0-based) yourself, for example from an intro timeline; `release()` returns to the scroll position. With `scrubFrom`, the clip can open on frames you play and then scroll from where it left off.

```ts
const control = createSequenceControl() // module constant or a ref
control.held = true
// timeline onUpdate: control.draw(i)
// timeline onComplete: control.release()
```

## Advanced options

By default the frame follows scroll through ScrollTrigger's `scrub` lerp. These change how it lands:

- `settle` with `settleThreshold` (frames, default `2`), how the eased frame finishes when scroll stops:
  - `"off"` (default): the eased frame, rounded.
  - `"snap"`: within `settleThreshold` frames of the scroll position, jump straight to it.
  - `"finish"`: after 100ms without scrolling, the lerp runs `settleThreshold` times faster so it catches up sooner.
  - `"quantise"`: ignore changes smaller than `settleThreshold` frames, so a nearly still scrub does not flicker.
- `springStiffness` and `springDamping`: with both set, a damped spring integrated on `gsap.ticker` replaces the scrub tween (`scrub` and `settle` are then ignored). It settles within a quarter frame.

## Installing for ScrubbedVideo

`@plutotcool/fsv` is an optional peer of the library, pinned to an exact version because it is v0 and its API is not stable:

```sh
pnpm add --save-exact @plutotcool/fsv@0.5.1
```

Its `dependencies` include `node-av` (ffmpeg native bindings) which pnpm 11 will not build until approved. Only the Node converter uses it, so in `pnpm-workspace.yaml` set `allowBuilds: { node-av: false }`. The renderer is loaded with a dynamic `import()`, so it is code-split. The starter also lists it as a root devDependency, only so `tsc` can typecheck `ScrubbedVideo`; for library consumers it stays an optional peer. Sites that do not use `ScrubbedVideo` still need it installed or `library/scrub/ScrubbedVideo.tsx` excluded in `tsconfig.json`, because `tsconfig.json` includes all `.tsx` files and the file imports a type from the package, so typechecking fails with TS2307 otherwise. It peers on `@types/node` ^25, so sites on `@types/node` 26 may see a peer warning.

## Encoding

Do not add the encoder as a dependency; run it once per clip:

```sh
pnpm dlx @plutotcool/fsv convert in.mp4 out.fsv --gop 5 --crf 20
```

Image frames are a plain numbered export (`frame0001.avif`, ...).
