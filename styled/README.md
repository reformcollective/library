# styled library

the `styled` utility is our zero-runtime css-in-js solution. it wraps `vanilla-extract` to provide an ergonomic API for building reactive, responsive components with static css generation.

it combines the best of both worlds:
- **zero runtime overhead**: styles are extracted to static css files.
- **developer experience**: type-safe props, variants, and a unified api.
- **responsive magic**: built-in utilities for fluid scaling and breakpoint switching.

## quick start

import `styled` and the `f` utility from `library/styled/alpha`.

```tsx
import { styled, f, css } from "library/styled/alpha"

const Box = styled("div", [
  // static styles with responsive scaling
  f.responsive(css`
    background: blue;
    padding: 20px; /* automatically converts to responsive units */
    border-radius: 8px;
  `),
  // specific overrides
  f.mobile(css`
    flex-direction: column;
  `)
])

// usage
function App() {
  return <Box>hello</Box>
}
```

---

## the `styled` api

`styled(Target, Config)`

### 1. target
can be an html tag (`"div"`, `"a"`) or a react component.

### 2. config object
for anything beyond simple static styles, pass a config object.

```ts
const Card = styled("article", {
  // 1. base styles (always applied)
  base: [
    f.responsive(css`
      display: flex;
      gap: 16px;
      padding: 24px;
      background: #fff;
    `)
  ],

  // 2. variants (prop-driven styles)
  variants: {
    tone: {
      light: [{ background: "#fff", color: "#000" }],
      dark: [{ background: "#000", color: "#fff" }]
    },
    size: {
      sm: [{ padding: 12 }],
      lg: [{ padding: 32 }]
    }
  },

  // 3. defaults (optional)
  defaultVariants: {
    tone: "light",
    size: "sm"
  },

  // 4. compound variants (styles for specific prop combos)
  compoundVariants: [
    {
      tone: "dark",
      size: "lg",
      base: [{ border: "1px solid #333" }]
    }
  ],

  // 5. tokens (dynamic css variables)
  tokens: {
    // maps the `rotation` prop to a css variable
    rotation: { token: createVar(), unit: "deg" }
  },

  // 6. within (scoped arbitrary child selectors)
  within: {
    "& *:hover": { transform: "translateY(-2px)" },
    "h2": { fontSize: 24, marginBottom: 8 }
  }
})
```

---

## responsive utilities (`f`)

the `f` object is your best friend. it handles unit conversion (px to vw), breakpoint isolation, and fluid scaling logic.

### `f.responsive` (the magic one)
takes standard css with pixel values and converts them into a responsive `calc()` expression that switches based on the viewport.

- **desktop**: scales with viewport width (vw)
- **tablet/mobile**: snaps to design breakpoints or scales depending on config

```ts
f.responsive({
  fontSize: "16px", // becomes a complex calc() covering all breakpoints
  margin: "20px 40px"
})
```

### breakpoint helpers
target specific ranges. these wrap your styles in `@media` queries.

- `f.desktop(...)`: desktop only
- `f.tablet(...)`: tablet only
- `f.mobile(...)`: mobile only
- `f.small(...)`: mobile + tablet
- `f.large(...)`: desktop + full width

### `f.scaledResponsive`
forces `vw` scaling across *all* breakpoints, ignoring the step-based switching of standard responsive mode.

---

## core features detailed

### variants
variants are the primary way to define component api. keys in `variants` become props on your component.

```tsx
// definition
variants: {
  intent: {
    primary: [{ background: "blue" }],
    danger: [{ background: "red" }]
  }
}

// usage
<Button intent="danger" />
```

### tokens (dynamic values)
use `tokens` when you need to pass arbitrary runtime values (like coordinates, colors from an api, or exact dimensions) into your static css.

```ts
import { createVar } from "@vanilla-extract/css"

const rotationVar = createVar()
const scaleVar = createVar()

const Rotator = styled("div", {
  tokens: {
    // automatically creates/uses a var, specify a default unit
    angle: { token: rotationVar, unit: "deg" },
	// shorthand
	scale: scaleVar
  },
  base: [{
    transform: `rotate(${rotationVar}) scale(${scaleVar})`
  }]
})

// usage - passes 45 to the css variable
<Rotator angle={45} />
```

### within (scoped selectors)
you can write selectors that target the current element in your css directly. this is recommended.
in the event that you need to write an arbitrary selector, use `within` to write selectors that are
automatically scoped to the component's class. prevents style leakage. you can also use `within` in
`variants` and `compoundVariants`

```ts
within: {
  "& > *": { marginBottom: 10 }, // direct children
  "span": { color: "red" } // any descendant span
}
```

### referencing components (`toString`)
styled components implement a `toString` method that returns their unique class selector (e.g., `.Box_root__1x2y3z`). this allows you to target one component from within another's styles.

```tsx
const Icon = styled("span", {
  base: [{ opacity: 0 }]
})

const Button = styled("button", {
  base: [{
    // using template literal interpolation calls .toString() automatically
    [`&:hover ${Icon}`]: {
      opacity: 1
    }
  }]
})
```

this is extremely powerful for composition, allowing parent components to orchestrate child styles without prop drilling.

### the `as` prop
at runtime, every styled component accepts an `as` prop to change the rendered element at runtime.
this is used under the hood, but you should also be able to use it yourself

```tsx
const Text = styled("p", { ... })

// renders an <h1> but keeps Text styles
<Text as="h1">Heading</Text>

// can also accept components
<Text as={Link} href="/home">Home</Text>
```

---

### .css.ts vs .tsx
- **preferred**: define styled components in `.tsx` files. the `vanilla-split` loader handles the heavy lifting.
- **Important:** Only define vanilla-extract styles in the file where they are used, or in a `.css.ts` file that is imported directly by the consumer file. 
- **Do not export** styled components or style objects from regular `.ts` or `.tsx` files for use elsewhere—this will fail.
- Use `.css.ts` files strictly for vanilla-extract variables, keyframes, global styles, or style objects that are imported (not exported) where needed.
