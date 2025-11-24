'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var browserslist = require('next/dist/compiled/browserslist');
var NextMiniCssExtractPluginDefault = require('next/dist/build/webpack/plugins/mini-css-extract-plugin');
var next = require('@vanilla-extract/webpack-plugin/next');
var findPagesDir = require('next/dist/lib/find-pages-dir');
var css = require('next/dist/build/webpack/config/blocks/css');
var fileResolve = require('next/dist/build/webpack/config/blocks/css/loaders/file-resolve');
var node_module = require('node:module');
var path = require('node:path');
var semver = require('semver');

function _interopDefault (e) { return e && e.__esModule ? e : { 'default': e }; }

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}

var browserslist__default = /*#__PURE__*/_interopDefault(browserslist);
var NextMiniCssExtractPluginDefault__default = /*#__PURE__*/_interopDefault(NextMiniCssExtractPluginDefault);
var path__namespace = /*#__PURE__*/_interopNamespace(path);
var semver__default = /*#__PURE__*/_interopDefault(semver);

// @ts-expect-error
const require$1 = node_module.createRequire((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('dist/vanilla-extract-next-plugin.cjs.dev.js', document.baseURI).href)));
const NextMiniCssExtractPlugin = NextMiniCssExtractPluginDefault__default["default"];

// Adopted from https://github.com/vercel/next.js/blob/1f1632979c78b3edfe59fd85d8cce62efcdee688/packages/next/build/webpack-config.ts#L60-L72
function getSupportedBrowsers(dir, isDevelopment) {
  try {
    return browserslist__default["default"].loadConfig({
      path: dir,
      env: isDevelopment ? 'development' : 'production'
    });
  } catch (_) {
    return undefined;
  }
}

// Adopt from Next.js' getGlobalCssLoader
// https://github.com/vercel/next.js/blob/6e5b935fd7a61497f6854a81aec7df3a5dbf61ac/packages/next/src/build/webpack/config/blocks/css/loaders/global.ts#L7
const getVanillaExtractCssLoaders = (options, assetPrefix, hasAppDir) => {
  const loaders = [];

  // Adopt from Next.js' getClientStyleLoader
  // https://github.com/vercel/next.js/blob/6e5b935fd7a61497f6854a81aec7df3a5dbf61ac/packages/next/src/build/webpack/config/blocks/css/loaders/client.ts#L3
  if (!options.isServer) {
    // https://github.com/vercel/next.js/blob/6e5b935fd7a61497f6854a81aec7df3a5dbf61ac/packages/next/src/build/webpack/config/blocks/css/loaders/client.ts#L16
    // Keep next-style-loader for development mode in `pages/`
    if (options.dev && !hasAppDir) {
      loaders.push({
        loader: 'next-style-loader',
        options: {
          insert: function (element) {
            // By default, style-loader injects CSS into the bottom
            // of <head>. This causes ordering problems between dev
            // and prod. To fix this, we render a <noscript> tag as
            // an anchor for the styles to be placed before. These
            // styles will be applied _before_ <style jsx global>.

            // These elements should always exist. If they do not,
            // this code should fail.
            const anchorElement = document.querySelector('#__next_css__DO_NOT_USE__');
            const parentNode = anchorElement.parentNode; // Normally <head>

            // Each style tag should be placed right before our
            // anchor. By inserting before and not after, we do not
            // need to track the last inserted element.
            parentNode.insertBefore(element, anchorElement);
          }
        }
      });
    } else {
      // https://github.com/vercel/next.js/blob/6e5b935fd7a61497f6854a81aec7df3a5dbf61ac/packages/next/src/build/webpack/config/blocks/css/loaders/client.ts#L44
      // next-style-loader will mess up css order in development mode.
      // Next.js appDir doesn't use next-style-loader either.
      // So we always use css-loader here, to simplify things and get proper order of output CSS
      loaders.push({
        loader: NextMiniCssExtractPlugin.loader,
        options: {
          publicPath: `${assetPrefix}/_next/`,
          esModule: false
        }
      });
    }
  }
  const postcss = () => css.lazyPostCSS(options.dir, getSupportedBrowsers(options.dir, options.dev), undefined);

  // https://github.com/vercel/next.js/blob/6e5b935fd7a61497f6854a81aec7df3a5dbf61ac/packages/next/src/build/webpack/config/blocks/css/loaders/global.ts#L28
  loaders.push({
    loader: require$1.resolve('next/dist/build/webpack/loaders/css-loader/src'),
    options: {
      postcss,
      importLoaders: 1,
      modules: false,
      url: (url, resourcePath) => {
        var _options$config$exper;
        return fileResolve.cssFileResolve(url, resourcePath, (_options$config$exper = options.config.experimental) === null || _options$config$exper === void 0 ? void 0 : _options$config$exper.urlImports);
      },
      import: (url, _, resourcePath) => {
        var _options$config$exper2;
        return fileResolve.cssFileResolve(url, resourcePath, (_options$config$exper2 = options.config.experimental) === null || _options$config$exper2 === void 0 ? void 0 : _options$config$exper2.urlImports);
      }
    }
  });

  // https://github.com/vercel/next.js/blob/6e5b935fd7a61497f6854a81aec7df3a5dbf61ac/packages/next/src/build/webpack/config/blocks/css/loaders/global.ts#L29-L38
  loaders.push({
    loader: require$1.resolve('next/dist/build/webpack/loaders/postcss-loader/src'),
    options: {
      postcss
    }
  });

  // https://github.com/SukkaW/style9-webpack/blob/f51c46bbcd95ea3b988d3559c3b35cc056874366/src/next-appdir/index.ts#L103-L105
  loaders.push({
    loader: next.VanillaExtractPlugin.loader
  });
  return loaders;
};
const createVanillaExtractPlugin = (pluginOptions = {}) => {
  return (nextConfig = {}) => {
    const {
      turbopackMode = 'auto',
      turbopackGlob = ['**/*.css.{js,cjs,mjs,jsx,ts,tsx}'],
      ...webpackPluginOptions
    } = pluginOptions;
    // detect Next version and decide whether to configure turbopack
    const nextVersion = (() => {
      try {
        // resolve from the consumer app's cwd, not this package
        const requireFromCwd = node_module.createRequire(path__namespace.join(process.cwd(), 'package.json'));
        const pkg = requireFromCwd('next/package.json');
        return (pkg === null || pkg === void 0 ? void 0 : pkg.version) ?? null;
      } catch {
        return null;
      }
    })();
    const coerced = nextVersion ? semver__default["default"].coerce(nextVersion) : null;
    const supportsTurbopackRules = !!coerced && semver__default["default"].gte(coerced, '16.0.0');
    const enableTurbopack = turbopackMode === 'on' || turbopackMode === 'auto' && supportsTurbopackRules;
    let turbopack;
    if (enableTurbopack) {
      turbopack = {
        ...(nextConfig.turbopack || {})
      };
      if (turbopackGlob.some(glob => {
        var _turbopack$rules;
        return (_turbopack$rules = turbopack.rules) === null || _turbopack$rules === void 0 ? void 0 : _turbopack$rules[glob];
      })) {
        throw new Error('Vanilla extract could not be applied automatically due to conflicting turbopack rules');
      }
      const vanillaExtractRule = {
        as: '*.js',
        loaders: [{
          loader: require$1.resolve('@vanilla-extract/turbopack-plugin'),
          options: {
            nextEnv: nextConfig.env ?? null,
            outputCss: pluginOptions.outputCss ?? null,
            identifiers: pluginOptions.identifiers ?? null
          }
        }]
      };
      turbopack.rules = {
        ...(turbopack.rules || {}),
        ...Object.fromEntries(turbopackGlob.map(glob => [glob, vanillaExtractRule]))
      };
    }
    const baseConfig = {
      ...nextConfig,
      webpack(config, options) {
        var _resolvedNextConfig$e;
        const {
          dir,
          dev,
          config: resolvedNextConfig
        } = options;

        // https://github.com/vercel/next.js/blob/1fb4cad2a8329811b5ccde47217b4a6ae739124e/packages/next/build/index.ts#L336
        // https://github.com/vercel/next.js/blob/1fb4cad2a8329811b5ccde47217b4a6ae739124e/packages/next/build/webpack-config.ts#L626
        // https://github.com/vercel/next.js/pull/43916
        // on Next.js 12, findPagesDirResult is a string. on Next.js 13, findPagesDirResult is an object
        const findPagesDirResult = findPagesDir.findPagesDir(dir, ((_resolvedNextConfig$e = resolvedNextConfig.experimental) === null || _resolvedNextConfig$e === void 0 ? void 0 : _resolvedNextConfig$e.appDir) ?? false);
        // Skip nextConfig check since appDir is stable feature after Next.js 13.4
        const hasAppDir = !!(findPagesDirResult && findPagesDirResult.appDir);
        const outputCss = true;

        // https://github.com/vercel/next.js/blob/6e5b935fd7a61497f6854a81aec7df3a5dbf61ac/packages/next/src/build/webpack/config/helpers.ts#L12-L21
        const cssRules = config.module.rules.find(rule => Array.isArray(rule.oneOf) && rule.oneOf.some(({
          test
        }) => typeof test === 'object' && typeof test.test === 'function' && test.test('filename.css'))).oneOf;

        // https://github.com/SukkaW/style9-webpack/blob/f51c46bbcd95ea3b988d3559c3b35cc056874366/src/next-appdir/index.ts#L187-L190
        cssRules.unshift({
          test: /vanilla\.virtual\.css/i,
          sideEffects: true,
          use: getVanillaExtractCssLoaders(options, resolvedNextConfig.assetPrefix, hasAppDir)
        });

        // vanilla-extract need to emit the css file on both server and client, both during the
        // development and production.
        // However, Next.js only add MiniCssExtractPlugin on pages dir + client build + production mode.
        //
        // To simplify the logic at our side, we will add MiniCssExtractPlugin based on
        // the "instanceof" check (We will only add our required MiniCssExtractPlugin if
        // Next.js hasn't added it yet).
        // This also prevent multiple MiniCssExtractPlugin being added (which will cause
        // RealContentHashPlugin to panic)
        if (!config.plugins.some(p => p instanceof NextMiniCssExtractPlugin)) {
          // HMR reloads the CSS file when the content changes but does not use
          // the new file name, which means it can't contain a hash.
          const filename = dev ? 'static/css/[name].css' : 'static/css/[contenthash].css';
          config.plugins.push(new NextMiniCssExtractPlugin({
            filename,
            chunkFilename: filename,
            // Next.js guarantees that CSS order "doesn't matter", due to imposed
            // restrictions:
            // 1. Global CSS can only be defined in a single entrypoint (_app)
            // 2. CSS Modules generate scoped class names by default and cannot
            //    include Global CSS (:global() selector).
            //
            // While not a perfect guarantee (e.g. liberal use of `:global()`
            // selector), this assumption is required to code-split CSS.
            //
            // If this warning were to trigger, it'd be unactionable by the user,
            // but likely not valid -- so just disable it.
            ignoreOrder: true
          }));
        }
        config.plugins.push(new next.VanillaExtractPlugin({
          outputCss,
          ...webpackPluginOptions
        }));
        if (typeof nextConfig.webpack === 'function') {
          return nextConfig.webpack(config, options);
        }
        return config;
      }
    };
    if (enableTurbopack && turbopack) {
      return {
        ...baseConfig,
        turbopack
      };
    }
    return baseConfig;
  };
};

exports.createVanillaExtractPlugin = createVanillaExtractPlugin;
