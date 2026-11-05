// A path's long, real form (U1 and U2 of docs/plans/hybrid-plan-step-plan.md). Claude Code never
// resolves an 8.3 short name, and git reports its top level in the real form, so every path this
// skill compares or builds a rule from goes through longOf first. It lives in lib/ because lib/
// is runtime (KTD16): flow.mjs uses it, and bench/shortpath.mjs imports it back from here.

import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

// The deepest part of `p` that exists, and the names below it that do not.
export function existingBase(p) {
  let base = resolve(p);
  const rest = [];
  while (!existsSync(base)) {
    const up = dirname(base);
    if (up === base) return null;
    rest.unshift(basename(base));
    base = up;
  }
  return { base, rest };
}

// A path's long form, the one every deny rule is built from: each 8.3 name expanded, letter case
// as on disk (fs.realpathSync.native, which also follows a junction or link, so a path through
// one comes back as its target). A part that does not exist yet is kept as given.
export function longOf(absPath) {
  const found = existingBase(absPath);
  if (!found) return resolve(absPath);
  const real = realpathSync.native(found.base);
  return found.rest.length ? join(real, ...found.rest) : real;
}
