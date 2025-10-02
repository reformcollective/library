import { type Compiler, createCompiler } from '@vanilla-extract/compiler';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import type { LoaderContext } from 'webpack';

// --- Part 1: Compiler Management Logic (Merged) ---

let compiler: Compiler | undefined;

// This function creates a unique, predictable placeholder string
const cssImportSpecifier = (filePath: string) =>
  `__VANILLA_EXTRACT_CSS_PLACEHOLDER_${path.basename(filePath)}__`;

const getCompiler = (projectRoot: string): Compiler => {
  if (compiler) {
    return compiler;
  }

  compiler = createCompiler({
    root: projectRoot,
    identifiers: process.env.NODE_ENV === 'production' ? 'short' : 'debug',
    cssImportSpecifier,
  });

  return compiler;
};


// --- Part 2: Main Loader Logic ---

export default async function vanillaExtractLoader(
  this: LoaderContext<unknown>,
) {
  const callback = this.async();
  
  try {
    const compiler = getCompiler(this.rootContext);
    const { resourcePath } = this;

    // 1. First, run processVanillaFile to transform the JS and generate the CSS in memory.
    //    It only returns the JavaScript source code.
    const { source } = await compiler.processVanillaFile(resourcePath, {
      outputCss: true,
    });
    
    // 2. Second, retrieve the generated CSS from the compiler's memory.
    const { css } = compiler.getCssForFile(resourcePath);
    
    if (!css) {
      // No CSS was generated, just return the JS
      return callback(null, source);
    }
    
    // 3. Generate a unique, stable filename for the CSS file
    const hash = crypto.createHash('md5').update(resourcePath).digest('hex');
    const cssFileName = `${path.basename(resourcePath, '.ts')}.${hash}.css`;
    
    const cssFilePath = path.join(
      this.rootContext,
      '.next',
      'cache',
      'vanilla-extract',
      cssFileName
    );

    // 4. Write the CSS to a physical file
    await fs.outputFile(cssFilePath, css);

    // 5. Calculate the relative path from the original file to the new CSS file
    const relativeCssPath = path.relative(path.dirname(resourcePath), cssFilePath);
    // Ensure forward slashes for cross-platform compatibility
    const importPath = `./${relativeCssPath.replace(/\\/g, '/')}`;

    // 6. Replace the placeholder in the JS with the real CSS import
    const placeholder = cssImportSpecifier(resourcePath);
    const finalSource = source.replace(`'${placeholder}';`, `'${importPath}';`);

    callback(null, finalSource);

  } catch (e) {
    callback(e as Error);
  }
}