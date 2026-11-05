// Run by the probe skill inside the child session (U1). Records, into <state>/stamp.json,
// where this script really ran from, the child's temp folder and the names of its
// environment variables. Values never leave the child: a CLAUDE-prefixed variable's value is
// recorded only as a short hash, so the probe can tell an inherited value from the child's own.

import { createHash } from "node:crypto";
import { realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const state = process.argv[2];
if (!state) {
  console.error("usage: node stamp.mjs <state-dir>");
  process.exit(2);
}
const hash = (v) => createHash("sha256").update(String(v)).digest("hex").slice(0, 16);
const names = Object.keys(process.env).sort();
const stamp = {
  self: realpathSync(fileURLToPath(import.meta.url)),
  cwd: process.cwd(),
  tmpdir: tmpdir(),
  envNames: names,
  claude: names.filter((k) => /^claude/i.test(k)).map((k) => ({ name: k, valueHash: hash(process.env[k]) })),
};
writeFileSync(join(state, "stamp.json"), JSON.stringify(stamp, null, 1) + "\n");
console.log(`UPLAN-STAMP ${names.length} variables`);
