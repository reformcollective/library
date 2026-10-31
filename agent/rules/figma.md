---
paths:
  - "app/**/*.tsx"
  - "app/**/*.ts"
---

# Figma Design Matching

Applies when implementing from a Figma file or URL.

Treat Figma as the source of truth unless told otherwise. Don't guess from screenshots. Pixel values are always scaled (`f.responsive` or `f.small`) unless stated otherwise.

Before implementing:

- Inspect whether key visuals are components, instances, variants, vectors, or exportable assets.
- Reuse existing Figma components, styles, variables and design-system assets before recreating anything.

Icons: export or inspect the exact SVG/vector data, preserving real bounds, strokes, fills and state variants. If exact export isn't possible, ask for assets or permission to approximate.

States and animation: inspect variants, component properties, prototype reactions and documented state frames. If states or timing are unclear, ask before coding.

Background graphics and complex visuals: export the exact node/layer, don't recreate it by eye. Export PNGs at 4x so `next/image` has quality to optimize from. If a high-quality export isn't possible, ask for one.
