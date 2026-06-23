import type { TurboLoaderOptions } from "@vanilla-extract/turbopack-plugin"
import type { NextConfig } from "next"
import type { TurbopackLoaderItem } from "next/dist/server/config-shared"

import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin"
import path from "node:path"

const withVanillaExtract = createVanillaExtractPlugin({
	unstable_turbopack: { mode: "on" },
})

export const withVanillaSplit = (config: NextConfig): NextConfig => {
	config.turbopack ??= {}
	config.turbopack.rules ??= {}

	// enable split loader for TS/TSX with nextEnv passthrough
	config.turbopack.rules["**/*.tsx"] = {
		loaders: [
			{
				loader: path.resolve(__dirname, "vanilla-split-loader.ts"),
				options: {
					nextEnv: config.env ?? null,
				} satisfies Partial<TurboLoaderOptions>,
			} as TurbopackLoaderItem,
		],
	}
	config.turbopack.rules["**/*.ts"] = {
		loaders: [
			{
				loader: path.resolve(__dirname, "vanilla-split-loader.ts"),
				options: {
					nextEnv: config.env ?? null,
				} satisfies Partial<TurboLoaderOptions>,
			} as TurbopackLoaderItem,
		],
	}

	const updatedConfig = withVanillaExtract(config)

	// @ts-expect-error not safe but fine for now
	updatedConfig.turbopack?.rules["vanilla.virtual.css"].loaders.unshift(
		require.resolve("./css-loader.ts"),
	)

	return updatedConfig
}
