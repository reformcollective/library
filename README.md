# library

## A library of Reform's utilities and helpers

### ignoring utilities

If there's any utilities that you aren't using in a project and they're causing errors,
you can add them to the exclude property in your tsconfig.json

For example, if you're don't have three.js installed, you can add it to the exclude property like so:

```json
{
  "exclude": ["node_modules", "src/library/threeJS"]
}
```
