# `styled` Utility Documentation

### Overview

The `styled` utility provides a powerful and ergonomic way to create styled React components using vanilla-extract. It offers a flexible API that supports static styles, dynamic styles based on props, and advanced features like CSS variables and scoped descendant selectors. This utility is designed to be highly performant by generating static CSS at build time while still allowing for dynamic variations at runtime.

### API Breakdown

The `styled` function is used to create a styled component. It accepts two arguments: the HTML tag or React component to style, and a configuration object or array for the styles.

#### Simple Usage (Static Styles)

For components with only static styles, you can provide an array of style objects. This is the simplest way to use the `styled` utility.

```javascript
import { styled, f, css } from "library/styled/alpha";

const SimpleComponent = styled("div", [
  f.responsive(css`
    color: blue;
  `),
  f.tablet(css`
    padding: 10px;
  `),
]);
```

#### Advanced Usage (Dynamic Styles)

For more complex components, you can use the configuration object to define variants, CSS variables, defaults, and `within` scoped selectors.

```javascript
import { styled } from "library/styled/alpha";
import { createVar } from "@vanilla-extract/css";

const heightVar = createVar();

const AdvancedComponent = styled("div", {
  base: [
    /* base styles */
  ],
  variants: {
    /* prop-based style variations */
  },
  defaults: {
    /* default variant values */
  },
  variables: {
    /* CSS variable mappings */
  },
  within: {
    /* scoped selectors relative to the component root */
  },
});
```

- **`base`**: An array of style objects that are always applied to the component.
- **`variants`**: An object where keys are prop names and values are objects mapping prop values to styles. This allows for creating different visual states based on props (e.g., `size`, `color`).
- **`defaults`**: An object specifying the default values for your variants.
- **`variables`**: An object for mapping component props to CSS variables, enabling fully dynamic styles like custom sizes or colors.

#### Within (scoped descendant selectors)

`within` lets you author descendant and self selectors that are automatically scoped to the component’s generated class. Internally this compiles to `globalStyle` anchored to the component.

Rules:

- `&` refers to the component root: `&:hover` → `.root:hover`
- Bare keys auto-descend: `p` → `.root p`
- Works at base, inside variant options, and in compound variants

```ts
const Card = styled("section", {
  base: [{ display: "grid", gap: 12 }],
  within: {
    "&:hover": { boxShadow: "0 6px 20px rgba(0,0,0,0.12)" },
    "h2": { margin: 0, fontWeight: 600 },
    "& > a": { textDecoration: "none", color: "inherit" },
  },
  variants: {
    density: {
      comfy: { base: [{ gap: 16 }], within: { h2: { marginTop: 6 } } },
      compact: { base: [{ gap: 8 }], within: { h2: { marginTop: 0 } } },
    },
  },
})
```

Note: Do not nest selectors inside the style object; put them in the `within` map.

#### Compound variants

You can define styles that apply when multiple variant conditions are met. These can also include `within` entries that scope to the compound’s marker class.

```ts
const Button = styled("button", {
  variants: {
    size: { sm: [{ fontSize: 12 }], lg: [{ fontSize: 16 }] },
    tone: { primary: [{ color: "white" }], neutral: [{ color: "#222" }] },
  },
  compoundVariants: [
    {
      size: "lg",
      tone: "primary",
      base: [{ fontWeight: 700 }],
      within: { "&:hover": { filter: "brightness(1.1)" } },
    },
  ],
})
```

### Component targets (styled(MyComponent))

You can style a React component target using `styled(MyComponent, config)`. This is supported in regular `.tsx` files via the vanilla-split pipeline, which splits the call into a build-time base and a runtime wrapper automatically. Nothing about the component is serialized; only the style config is.

Usage in a normal component file:

```tsx
import { styled } from "library/styled/alpha"

function Target(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} data-kind="target" />
}

export const StyledOnComponent = styled(Target, {
  base: [{ padding: 8, background: "#223" }],
  variants: { tone: { brand: [{ color: "#0af" }], neutral: [{ color: "#ccc" }] } },
  defaults: { tone: "brand" },
})

// Usage
// <StyledOnComponent tone="neutral">hello</StyledOnComponent>
```

Constraints and notes:
- In `.css.ts(x)` files, keep using `styled('tag', ...)`. If you need to target a component from a `.css.ts(x)` module, prefer the `as` prop from a consumer module.
- The split loader only transforms `styled` imported from `library/styled/alpha`.
- `ref` is a normal prop in React 19 and flows to the render target.

### Render target override (`as` prop)

All components created with `styled` accept an `as` prop to change the render target at runtime. This works for both DOM tags and React components. Variant and `variables` props are filtered from the DOM and won’t leak.

```tsx
const Box = styled("div", { base: [{ padding: 12, background: "#123" }] })

function LinkLike(props: React.ComponentProps<"a">) {
  return <a {...props} />
}

// Render Box as a component
<Box as={LinkLike} href="#">linky</Box>

// Render Box as a tag
<Box as="button" type="button" />
```

### Key Features and Usage Patterns

#### Variants

Variants allow you to define different styles based on component props. This is useful for creating components with multiple states, like buttons with different colors or sizes.

```javascript
const Button = styled("button", {
  base: [{ padding: "10px 20px" }],
  variants: {
    color: {
      primary: [{ background: "blue", color: "white" }],
      secondary: [{ background: "gray", color: "black" }],
    },
  },
  defaults: {
    color: "primary",
  },
});

// Usage: <Button color="secondary">Click Me</Button>
```

#### CSS Variables (`variables`)

For styles that need to be fully dynamic, you can use CSS variables. This is perfect for properties that can have a wide range of values, like `width`, `height`, or `transform`.

```javascript
const heightVar = createVar();

const DynamicBox = styled("div", {
  base: [{ border: "1px solid black" }],
  variables: {
    height: { token: heightVar, unit: "px" },
  },
});

// Usage: <DynamicBox height={100} />
```

#### Slots

Slots provide a way to style child or descendant components, which is useful for creating complex, reusable components.

```javascript
const Card = styled("div", {
  base: [{ padding: "16px" }],
  within: {
    h2: [{ fontSize: "24px" }],
    p: [{ marginTop: "8px" }],
  },
});

// Usage: (
//   <Card>
//     <h2>Title</h2>
//     <p>Content</p>
//   </Card>
// )
```
