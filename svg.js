const plugin = require("@svgr/webpack")

module.exports = function (source) {
	if (this.resourceQuery === "?inline") {
		return plugin.call(this, source)
	}

	// load the SVG as base64 data URL
	const data = Buffer.from(source).toString("base64")

	// return the data URL
	return `export default "data:image/svg+xml;base64,${data}"`
}
