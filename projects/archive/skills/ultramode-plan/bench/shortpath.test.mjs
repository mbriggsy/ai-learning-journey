// shortOf against cmd.exe's own short-path expansion (%~sI), a second reading of the same file
// system that shares no code with it, so the test holds whether or not the volume makes 8.3 names.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { longOf } from "../lib/paths.mjs";
import { shortOf } from "./shortpath.mjs";
import { tmpRoot } from "./testkit.mjs";

const win = process.platform === "win32";
const cmdShort = (p) => execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `for %I in ("${p}") do @echo %~sI`], { encoding: "utf8", windowsVerbatimArguments: true, windowsHide: true }).trim();
const sameFile = (a, b) => statSync(a).ino === statSync(b).ino && statSync(a).dev === statSync(b).dev;
// A test folder in its long form, whatever spelling the temp folder is given in.
const longTmp = (t) => longOf(tmpRoot(t));

test("off Windows there is no short name", { skip: win && "platform: off Windows only" }, () => {
  assert.equal(shortOf("/home/x/a-long-folder-name"), null);
});

test("a folder and a file with long names, a quote among them, read the same as cmd's expansion and name the same file", { skip: !win && "platform: Windows only (8.3 short names)" }, (t) => {
  const dir = join(longTmp(t), "it's a long folder name");
  mkdirSync(dir);
  const file = join(dir, "settings.local.json");
  writeFileSync(file, "{}");
  for (const p of [dir, file]) {
    const want = cmdShort(p);
    const got = shortOf(p);
    assert.equal(got, want.toLowerCase() === p.toLowerCase() ? null : want, p);
    if (got) assert.ok(sameFile(got, p), `${got} is ${p}`);
    // A long path in other letter case is still the long form, never refused as short.
    assert.equal(shortOf(p.toUpperCase())?.toLowerCase(), got?.toLowerCase(), `${p} in upper case`);
  }
});

test("a name holding a curly quote, which PowerShell also reads as a quote, still gets its short name", { skip: !win && "platform: Windows only (8.3 short names)" }, (t) => {
  const dir = join(longTmp(t), "Briggsy\u2019s long folder");
  mkdirSync(dir);
  const got = shortOf(dir);
  assert.ok(got, "a short name came back");
  assert.match(basename(got), /~\d+$/);
  assert.ok(sameFile(got, dir));
});

test("a path that does not exist yet keeps its missing part long under its folders' short names", { skip: !win && "platform: Windows only (8.3 short names)" }, (t) => {
  const dir = join(longTmp(t), "a-long-folder-name-for-83");
  mkdirSync(dir);
  const short = shortOf(dir) ?? dir;
  assert.equal(shortOf(join(dir, "missing", "settings.local.json")) ?? join(dir, "missing", "settings.local.json"), join(short, "missing", "settings.local.json"));
});

test("a path whose every name is already 8.3 gives null", { skip: !win && "platform: Windows only (8.3 short names)" }, () => {
  const sys = join(process.env.SystemRoot || "C:\\Windows", "System32");
  assert.equal(cmdShort(sys).toLowerCase(), sys.toLowerCase(), "the oracle agrees it has no short spelling");
  assert.equal(shortOf(sys), null);
});

test("a path given in 8.3 form, or through a junction, is refused, and longOf gives the long form back", { skip: !win && "platform: Windows only (8.3 short names)" }, (t) => {
  const root = longTmp(t);
  const dir = join(root, "a-long-folder-name-for-83");
  mkdirSync(dir);
  const short = shortOf(dir);
  assert.ok(short, "the volume makes 8.3 names here; without one this test proves nothing");
  assert.throws(() => shortOf(short), /long form/);
  assert.throws(() => shortOf(join(short, "missing.json")), /long form/, "a missing leaf under a short folder too");
  assert.equal(longOf(short), dir);
  assert.equal(longOf(join(short, "missing.json")), join(dir, "missing.json"));
  assert.equal(longOf(dir.toUpperCase()), dir, "letter case as on disk");
  const link = join(root, "a-junction-to-the-folder");
  symlinkSync(dir, link, "junction");
  assert.throws(() => shortOf(link), /junction/);
});
