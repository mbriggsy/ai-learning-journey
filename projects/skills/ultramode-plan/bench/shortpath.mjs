#!/usr/bin/env node
// A path's Windows 8.3 short spelling (U1 of docs/plans/hybrid-plan-step-plan.md, for KTD16's
// deny set). Claude Code matches a deny rule against the path a tool call names, in either case
// and with either slash, but it never resolves a short name (measured on CLI 2.1.318: a Write
// through AI-LEA~1 went past every long-form rule, and a Read through THE-BA~1 under a long-form
// root went past too). So the deny set has to name each spelling itself, and this module says
// what the short one is.
//
// Usage: node shortpath.mjs <path>...   prints each path's short spelling, or "none".

import { execFileSync } from "node:child_process";
import { existsSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { isMain, usage } from "../lib/entry.mjs";

// The deepest part of `p` that exists, and the names below it that do not.
function existingBase(p) {
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

// The short spelling of an absolute path in its long form, or null off Windows or when it is the
// same as the long one (no component has a short name). A path that does not exist yet (a
// settings file never written) has no short name of its own, but its folders may: the deepest
// existing ancestor is shortened and the rest is kept as given. One PowerShell call per path,
// the path handed over in an environment variable so no quote in it can break the command.
// It throws, never returns null, on a failed call, and on a path that is not in its long form
// (an 8.3 name in it, or a junction on the way): its short spelling would be the path itself,
// and the deny set built from it would miss the long one without a sign.
export function shortOf(absPath) {
  if (process.platform !== "win32") return null;
  const long = resolve(absPath);
  const found = existingBase(long);
  if (!found) return null;
  const real = realpathSync.native(found.base);
  if (real.toLowerCase() !== found.base.toLowerCase()) throw new Error(`shortOf needs a path in its long form, with no 8.3 name and no junction on the way: ${found.base} is ${real}`);
  const kind = statSync(found.base).isDirectory() ? "GetFolder" : "GetFile";
  const command = `[Console]::OutputEncoding = [Text.Encoding]::UTF8; (New-Object -ComObject Scripting.FileSystemObject).${kind}($env:UPLAN_SHORTPATH_OF).ShortPath`;
  const out = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", command], { encoding: "utf8", windowsHide: true, env: { ...process.env, UPLAN_SHORTPATH_OF: found.base } }).trim();
  if (!out) throw new Error(`no short path came back for ${found.base}`);
  const short = found.rest.length ? join(out, ...found.rest) : out;
  return short.toLowerCase() === long.toLowerCase() ? null : short;
}

if (isMain(import.meta.url)) {
  const paths = process.argv.slice(2);
  if (!paths.length) usage("node shortpath.mjs <path>...");
  for (const p of paths) console.log(`${resolve(p)} -> ${shortOf(longOf(p)) ?? "none"}`);
}
