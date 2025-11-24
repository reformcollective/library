'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./vanilla-extract-next-plugin.cjs.prod.js");
} else {
  module.exports = require("./vanilla-extract-next-plugin.cjs.dev.js");
}
