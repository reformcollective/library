import path from "node:path";
import type { NextConfig } from "next";

export const withVanillaExtract = (config:NextConfig): NextConfig => {
    config.turbopack ??= {}
    config.turbopack.rules ??= {}
    config.turbopack.rules["*.css.ts"] = {
        loaders: [
            path.resolve(__dirname, "vanilla-extract-loader.ts"),
        ],
        as: "*.js",
    }
    return config
}