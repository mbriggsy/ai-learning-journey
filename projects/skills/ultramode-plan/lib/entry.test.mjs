import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, symlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpRoot } from "../bench/testkit.mjs";

const lib = dirname(fileURLToPath(import.meta.url));
const skill = dirname(lib);

// Every command-line module in the skill: each one that calls isMain on itself, found by reading
// the folders, so a new command cannot be left out of the entry check (bench's shortpath.mjs was,
// while the list was written by hand).
const FOLDERS = ["lib", "bench", join("bench", "probe")];
const COMMANDS = FOLDERS.flatMap((f) =>
  readdirSync(join(skill, f))
    .filter((n) => n.endsWith(".mjs") && !n.endsWith(".test.mjs"))
    .filter((n) => readFileSync(join(skill, f, n), "utf8").includes("isMain(import.meta.url)"))
    .map((n) => join(f, n)),
);
// The modules U5's generator inlines into Workflow scripts.
const INLINED = ["vote-law.mjs", "select.mjs", "caps.mjs"];

// KTD1: the brief bench's commands ran as silent no-ops through the ~/.claude/skills junction
// until ee67c08a. Every command, run through a linked folder with no arguments, prints its usage
// and exits non-zero.
test("each command run through a linked folder with no arguments prints its usage and exits non-zero", (t) => {
  for (const known of ["lib/fold.mjs", "lib/flow.mjs", "bench/freeze.mjs", "bench/launch.mjs", "bench/shortpath.mjs", "bench/transcripts.mjs", "bench/window.mjs", "bench/secrets.mjs", "bench/probe/probe.mjs"]) {
    assert.ok(COMMANDS.includes(join(...known.split("/"))), `${known} was not found as a command`);
  }
  const link = join(tmpRoot(t), "linked-skill");
  symlinkSync(skill, link, process.platform === "win32" ? "junction" : "dir");
  for (const cmd of COMMANDS) {
    const r = spawnSync(process.execPath, [join(link, cmd)], { encoding: "utf8" });
    assert.equal(r.status, 2, `${cmd} exited ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /^usage: /m, `${cmd} printed no usage`);
  }
});

// Every name a module declares at its top level (unindented const, let, var, function, class).
const topNames = (text) => [...text.matchAll(/^(?:export\s+)?(?:const|let|var|function\*?|class|async\s+function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);

test("the modules U5 inlines import nothing, read no clock or random number, and share no top-level name", () => {
  const seen = new Map();
  for (const file of INLINED) {
    const text = readFileSync(join(lib, file), "utf8");
    assert.doesNotMatch(text, /^\s*import\b/m, `${file} imports something`);
    assert.doesNotMatch(text, /\bDate\.now\(|\bMath\.random\(|\bnew Date\(\s*\)|\brequire\(/, `${file} reads the clock, a random number or a module`);
    const names = topNames(text);
    assert.ok(names.length > 0, `${file}: no top-level names found, so this check saw nothing`);
    for (const n of names) {
      assert.ok(!seen.has(n), `${n} is declared in both ${seen.get(n)} and ${file}`);
      seen.set(n, file);
    }
  }
});
