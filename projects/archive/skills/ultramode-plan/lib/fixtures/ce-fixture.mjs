// Test fixtures for the CE resolver and the run record (U3): CE install folders and plugin
// registries built on the measured registry shape (installed_plugins.v2.json, captured and scrubbed
// on 2026-11-04 from CLI 2.1.318). Used by lib/resolve-ce.test.mjs and lib/run-record.test.mjs.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CE_FILES, PLUGIN } from "../resolve-ce.mjs";
import { writeAt } from "../../bench/testkit.mjs";

export const MEASURED = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "installed_plugins.v2.json"), "utf8"));
export const SHA_NEW = "799ac9aeb97bf1c51238c38122915470413c26c5";
export const SHA_OLD = "34492300c0ffee0000000000000000000000beef";

// One CE install folder holding every CE_FILES file (but `missing`), each with text naming its
// version, so a read of the wrong version shows in the hash.
export function ceInstall(root, version, { missing = [] } = {}) {
  const dir = join(root, "cache", "every-marketplace", "compound-engineering", version);
  for (const f of CE_FILES) if (!missing.includes(f.key)) writeAt(join(dir, ...f.file.split("/")), `# ${f.key} at ${version}\n`);
  writeAt(join(dir, "plugin.json"), "{}\n");
  return dir;
}

// A registry file: the measured one, with CE's entries replaced (undefined removes CE). Each call
// writes its own file, so a test can hold several at once; `at` rewrites one in place.
let registries = 0;
export function registryAt(root, ceEntries, { version = 2, at } = {}) {
  const reg = structuredClone(MEASURED);
  reg.version = version;
  if (ceEntries === undefined) delete reg.plugins[PLUGIN];
  else reg.plugins[PLUGIN] = ceEntries;
  const path = at ?? join(root, `installed_plugins-${++registries}.json`);
  writeFileSync(path, JSON.stringify(reg, null, 2));
  return path;
}

export const ceEntry = (installPath, sha, version, scope = "user") => ({ scope, installPath, version, installedAt: "2026-03-30T15:25:44.123Z", lastUpdated: "2026-11-04T23:25:19.989Z", gitCommitSha: sha });
