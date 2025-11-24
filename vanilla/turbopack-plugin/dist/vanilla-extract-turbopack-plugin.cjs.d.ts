import { IdentifierOption } from '@vanilla-extract/integration';
import fs from 'node:fs';

type TurboLoaderContext<OptionsType> = {
    getOptions: {
        (): OptionsType;
    };
    getResolve: (options: unknown) => {
        (context: string, request: string): Promise<string>;
    };
    fs: {
        readFile: typeof fs.readFile;
    };
    rootContext: string;
    resourcePath: string;
};
type TurboLoaderOptions = {
    identifiers: IdentifierOption | null;
    outputCss: boolean | null;
    nextEnv: Record<string, string | undefined> | null;
};
/**
 * reset the global state, used in tests to cleanup the compiler
 */
declare const cleanupSharedCompiler: () => void;
declare function turbopackVanillaExtractLoader(this: TurboLoaderContext<TurboLoaderOptions>): Promise<string>;

export { type TurboLoaderContext, type TurboLoaderOptions, cleanupSharedCompiler, turbopackVanillaExtractLoader as default };
