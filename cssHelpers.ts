/**
 * a selector to use when applying styles to auto-filled inputs
 * be aware that browsers may attempt to change the text and background colors
 *
 * @example
 * ```tsx
 * const Control = styled(Form.Control)`
 *   ${inputAutofill} {
 *     color: white;
 *     background: black;
 *   }
 * `
 * ```
 */
export const inputAutofill = `
  &:autofill,
  &[data-com-onepassword-filled]
`
