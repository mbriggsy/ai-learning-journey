// A path's long, real form (U1 and U2 of docs/plans/hybrid-plan-step-plan.md). Claude Code never
// resolves an 8.3 short name, and git reports its top level in the real form, so every path this
// skill compares or builds a rule from goes through longOf first, after fromGitBash for a typed
// one. It lives in lib/ because lib/ is runtime (KTD16): flow.mjs uses it, and the bench imports
// it from here.

import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

// A path typed in Git Bash's drive form ("/c/Users/x", or "/c" alone) as the Windows path it
// names ("C:/Users/x", "C:/"); any other text, and every path off Windows, comes back as given.
// It runs before resolve(): resolve("D:\\work", "/c/x") is already D:\c\x, a folder named c.
// Every path a session types (a plan path, a job folder) goes through this first.
export function fromGitBash(text, platform = process.platform) {
  const s = String(text);
  if (platform !== "win32") return s;
  return s.replace(/^\/([a-zA-Z])(?:\/|$)/, (_, drive) => `${drive.toUpperCase()}:/`);
}

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

// Whether two paths in their long form name the same file: in either letter case on Windows,
// whose file system does not tell them apart, and exactly elsewhere.
export function samePath(a, b, platform = process.platform) {
  return platform === "win32" ? String(a).toLowerCase() === String(b).toLowerCase() : String(a) === String(b);
}
