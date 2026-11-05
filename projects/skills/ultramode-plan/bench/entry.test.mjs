import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { symlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpRoot } from "./testkit.mjs";

const bench = dirname(fileURLToPath(import.meta.url));
const COMMANDS = ["freeze.mjs", "launch.mjs", "transcripts.mjs", "window.mjs", "secrets.mjs", join("probe", "probe.mjs")];

// KTD1: the brief bench's commands ran as silent no-ops through the ~/.claude/skills junction
// until ee67c08a. Every command here, run through a linked folder with no arguments, prints
// its usage and exits non-zero.
test("each command run through a linked folder with no arguments prints its usage and exits non-zero", (t) => {
  const link = join(tmpRoot(t), "linked-bench");
  symlinkSync(bench, link, process.platform === "win32" ? "junction" : "dir");
  for (const cmd of COMMANDS) {
    const r = spawnSync(process.execPath, [join(link, cmd)], { encoding: "utf8" });
    assert.equal(r.status, 2, `${cmd} exited ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /^usage: /m, `${cmd} printed no usage`);
  }
});
