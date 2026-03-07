/**
 * orchestrator.js — Backward-compatible facade
 *
 * The actual implementation now lives in drivers/cli-driver.js.
 * This file re-exports CLIDriver so existing consumers (tests, bin/overdrive.js)
 * continue to work without changes.
 */

module.exports = require('./drivers/cli-driver');
