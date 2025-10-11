import path from "node:path"
import type { NextConfig } from "next"
import type { TurbopackLoaderItem } from "next/dist/server/config-shared"

export const withVanillaSplit = (config: NextConfig): NextConfig => {
	config.turbopack ??= {}
	config.turbopack.rules ??= {}
	// enable split loader for TS/TSX with nextEnv passthrough
	config.turbopack.rules["**/*.tsx"] = {
		loaders: [
			{
				loader: path.resolve(__dirname, "vanilla-split-loader.ts"),
				options: { nextEnv: config.env ?? null },
			} as TurbopackLoaderItem,
		],
	}
	config.turbopack.rules["**/*.ts"] = {
		loaders: [
			{
				loader: path.resolve(__dirname, "vanilla-split-loader.ts"),
				options: { nextEnv: config.env ?? null },
			} as TurbopackLoaderItem,
		],
	}
	config.turbopack.rules[
		"*{.css.ts,.css.tsx,.css.js,.css.jsx,vanilla.virtual.css}"
	] = {
		loaders: [
			// only run the vanilla-extract turbopack plugin; split precompiles virtual content
			{
				loader: require.resolve("./turbopack-plugin"),
				options: {
					nextEnv: config.env ?? null,
					outputCss: null,
					identifiers: null,
				},
			} as unknown as TurbopackLoaderItem,
		],
	}

	// config.turbopack.rules["**/vanilla.virtual.css"] = {
	// 	as: "*.css",
	// 	loaders: [require.resolve("./turbopack-plugin")],
	// }

	return config
}
