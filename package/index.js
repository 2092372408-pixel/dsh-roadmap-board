/**
 * dsh-roadmap-board — host plugin entry (experimental packaging).
 *
 * Adapt to your DSH plugin-loader contract before using:
 *  1) determine the module shape the loader expects (function/object export,
 *     plugin descriptor location), then wrap accordingly;
 *  2) decide how the Client overlay half ships for your web profile
 *     (bundle the client code in ../src/board-client.js or keep dynamic);
 *  3) run a mount-validation / new-session check after `dsh plugin add ./package`.
 *
 * The host source in ../src/board-host.js is the body of a function taking
 * (ctx, harness, console) and returning the Cordis plugin object; we wrap it
 * accordingly below.
 */
const fs = require('fs')
const path = require('path')

const hostBody = fs.readFileSync(path.join(__dirname, '..', 'src', 'board-host.js'), 'utf8')

function buildHost(ctx, harness, consoleLike) {
  // eslint-disable-next-line no-new-func
  const fn = new Function('ctx', 'harness', 'console', '"use strict";\n' + hostBody)
  return fn(ctx, harness, consoleLike)
}

module.exports = function (ctx, meta) {
  return buildHost(ctx, (meta && meta.harness) || global.harness, console)
}

module.exports.buildHost = buildHost
