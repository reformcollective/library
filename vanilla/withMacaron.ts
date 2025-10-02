import path from "node:path"
import type { NextConfig } from "next"
import { withVanillaExtract } from "./withVanillaExtract"

export const withMacaron = (config: NextConfig): NextConfig => {
	config.turbopack ??= {}
	config.turbopack.rules ??= {}
	config.turbopack.rules["**/*.tsx"] = {
		loaders: [path.resolve(__dirname, "macaron-loader.ts")],
	}
	config.turbopack.rules["**/*.ts"] = {
		loaders: [path.resolve(__dirname, "macaron-loader.ts")],
	}
	return withVanillaExtract(config)
}
