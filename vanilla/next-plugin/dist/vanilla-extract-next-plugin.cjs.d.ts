import { VanillaExtractPlugin } from '@vanilla-extract/webpack-plugin/next';
import { NextConfig } from 'next/dist/server/config-shared';

type PluginOptions = ConstructorParameters<typeof VanillaExtractPlugin>[0] & {
    turbopackGlob?: string[];
    /**
     * controls whether we attempt to configure turbopack
     * auto: enable only when Next >= 16.0.0
     * on: force enable regardless of detected Next version
     * off: never configure turbopack, webpack only
     */
    turbopackMode?: 'auto' | 'on' | 'off';
};
declare const createVanillaExtractPlugin: (pluginOptions?: PluginOptions) => (nextConfig?: NextConfig) => NextConfig;

export { createVanillaExtractPlugin };
