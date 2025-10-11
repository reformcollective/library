# `styled` Utility Documentation

### Overview

The `styled` utility provides a powerful and ergonomic way to create styled React components using vanilla-extract. It offers a flexible API that supports static styles, dynamic styles based on props, and advanced features like CSS variables and component slots. This utility is designed to be highly performant by generating static CSS at build time while still allowing for dynamic variations at runtime.

### API Breakdown

The `styled` function is used to create a styled component. It accepts two arguments: the HTML tag or React component to style, and a configuration object or array for the styles.

#### Simple Usage (Static Styles)

For components with only static styles, you can provide an array of style objects. This is the simplest way to use the `styled` utility.

```javascript
import { styled } from "library/styled";
import { f, css } from "library/styled-legacy";

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

For more complex components, you can use the configuration object to define variants, CSS variables, default styles, and slots.

```javascript
import { styled } from "library/styled";
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
  vars: {
    /* CSS variable mappings */
  },
  slots: {
    /* descendant component styles */
  },
});
```

- **`base`**: An array of style objects that are always applied to the component.
- **`variants`**: An object where keys are prop names and values are objects mapping prop values to styles. This allows for creating different visual states based on props (e.g., `size`, `color`).
- **`defaults`**: An object specifying the default values for your variants.
- **`vars`**: An object for mapping component props to CSS variables, enabling fully dynamic styles like custom sizes or colors.
- **`slots`**: An object for styling descendant components, allowing for more complex component structures.

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

#### CSS Variables (`vars`)

For styles that need to be fully dynamic, you can use CSS variables. This is perfect for properties that can have a wide range of values, like `width`, `height`, or `transform`.

```javascript
const heightVar = createVar();

const DynamicBox = styled("div", {
  base: [{ border: "1px solid black" }],
  vars: {
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
  slots: {
    title: [{ fontSize: "24px" }],
    content: [{ marginTop: "8px" }],
  },
});

// Usage: (
//   <Card>
//     <h2 className={Card.slots.title}>Title</h2>
//     <p className={Card.slots.content}>Content</p>
//   </Card>
// )
```
