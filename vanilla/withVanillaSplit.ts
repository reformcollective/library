import path from "node:path"
import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin"
import type { TurboLoaderOptions } from "@vanilla-extract/turbopack-plugin"
import type { NextConfig } from "next"
import type { TurbopackLoaderItem } from "next/dist/server/config-shared"

const withVanillaExtract = createVanillaExtractPlugin()

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

	// @ts-expect-error - next-plugin will install next@12 which is obviously wrong
	return withVanillaExtract(config)
}
