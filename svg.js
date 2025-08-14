const plugin = require("@svgr/webpack")

module.exports = function (source) {
	if (this.resourceQuery === "?inline") {
		return plugin.call(this, source)
	}

	// load the SVG as base64 data URL
	const data = Buffer.from(source).toString("base64")

	// extract the SVG width, height, and viewBox
	const rawWidth = source.match(/width="(\d+)"/)?.[1]
	const rawHeight = source.match(/height="(\d+)"/)?.[1]
	const rawViewBox = source.match(/viewBox="(\d+ \d+ \d+ \d+)"/)?.[1]

	const width = Number.parseInt(rawWidth, 10) || 0
	const fallbackWidth = Number.parseInt(rawViewBox?.split(" ")[2], 10) || 0
	const height = Number.parseInt(rawHeight, 10) || 0
	const fallbackHeight = Number.parseInt(rawViewBox?.split(" ")[3], 10) || 0

	const result = {
		src: `data:image/svg+xml;base64,${data}`,
		// if width and height are undefined, we use 1 so that next image will accept it
		width: width || fallbackWidth || 1,
		height: height || fallbackHeight || 1,
		blurWidth: 0,
		blurHeight: 0,
	}

	// return the data URL
	return `export default ${JSON.stringify(result)}`
}
