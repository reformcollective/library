// matches expressions like:
// --s-1: ignored;
// --s-930: ignored;
// --s-99999999: ignored;
// etc
const ignoredRegex = /--s-\d+: ignored;/g
const layerPrelude = "@layer reset, foundation, library;"
const layerRegex = /@layer\s+(reset|foundation|library)\b/

export default function cssLoader(css: string) {
	const cleaned = css.replaceAll(ignoredRegex, "")
	if (!layerRegex.test(cleaned) || cleaned.trimStart().startsWith(layerPrelude))
		return cleaned
	return `${layerPrelude}\n${cleaned}`
}
