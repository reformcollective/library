import { babelTransform } from "@macaron-css/integration"
import fs from "fs-extra"
import path from "path"
import type { LoaderContext } from "webpack"

export default async function macaronLoader(
	this: LoaderContext<unknown>,
	sourceCode: string,
) {
	const callback = this.async()
	const { resourcePath } = this

	try {
		if (resourcePath.endsWith(".css.ts")) {
			return callback(null, sourceCode)
		}

		const {
			code,
			result: [file, cssExtract],
		} = await babelTransform(resourcePath)

		if (!cssExtract || !file) {
			return callback(null, sourceCode)
		}

		const packagePath = path.join(
			this.rootContext,
			".next",
			"cache",
			"macaron",
			"package.json",
		)
		const extractedCssPath = path.join(
			this.rootContext,
			".next",
			"cache",
			"macaron",
			file,
		)

		await fs.outputFile(packagePath, '{"type": "module"}')
		await fs.outputFile(extractedCssPath, cssExtract)

		const relativePath = path.relative(
			path.dirname(resourcePath),
			extractedCssPath,
		)
		const importPath = `./${relativePath.replace(/\\/g, "/")}`

		const finalCode = code?.replace(`"${file}"`, `"${importPath}"`)

		callback(null, finalCode)
	} catch (e) {
		callback(e as Error)
	}
}
