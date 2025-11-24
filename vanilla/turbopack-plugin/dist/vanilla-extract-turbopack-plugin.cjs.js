'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./vanilla-extract-turbopack-plugin.cjs.prod.js");
} else {
  module.exports = require("./vanilla-extract-turbopack-plugin.cjs.dev.js");
}
