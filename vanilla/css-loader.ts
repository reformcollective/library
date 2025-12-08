// matches expressions like:
// --s-1: ignored;
// --s-930: ignored;
// --s-99999999: ignored;
// etc
const ignoredRegex = /--s-\d+: ignored;/g

export default function cssLoader(css: string) {
	return css.replaceAll(ignoredRegex, "")
}
