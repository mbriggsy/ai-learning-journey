import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkIds, definedIds, drift, foldCheck, grepList } from "./fold.mjs";
import { tmpRoot } from "../bench/testkit.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// A small plan in CE's unified shape: R-IDs as a list, KTDs as bold list items, units as headings
// and as a table.
const PLAN = `# Plan

### Requirements
- R1. A run keeps CE's method.
- R2. Every helper runs on Opus at xhigh.

### Key Technical Decisions
- KTD1. **Three saved scripts.** Uses 3 refuters on a P1.
- KTD2. **CE files from the registry.** Governs R2.

| U-ID | Title |
|---|---|
| U1 | Bench |
| U2 | Core logic |

### U1. Bench
Builds the bench (R1).

### U2. Core logic
Ports the vote law: 3 refuters on a P1, 2 on a P2.
`;

test("the hybrid plan's own R, U and KTD IDs are all found, and an unchanged ID set passes", () => {
  const real = readFileSync(join(here, "..", "docs", "plans", "hybrid-plan-step-plan.md"), "utf8");
  const ids = definedIds(real);
  for (const id of ["R1", "R13", "U1", "U11", "KTD1", "KTD24"]) assert.ok(ids.includes(id), id);
  assert.equal(checkIds(real, real).ok, true);
  assert.deepEqual(definedIds(PLAN), ["R1", "R2", "U1", "U2", "KTD1", "KTD2"]);
  const same = checkIds(PLAN, PLAN);
  assert.equal(same.ok, true);
  assert.equal(same.before, 6);
});

test("a renumbered U-ID fails, naming it", () => {
  const renumbered = PLAN.replace("### U2. Core logic", "### U3. Core logic").replace("| U2 | Core logic |", "| U3 | Core logic |");
  const r = checkIds(PLAN, renumbered);
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ["U2"]);
  assert.match(r.problems.join(" "), /gone after the fold: U2/);
});

test("a deleted R or KTD fails, naming it; one still mentioned but no longer defined fails too", () => {
  const noR2 = PLAN.replace("- R2. Every helper runs on Opus at xhigh.\n", "").replace("Governs R2.", "Governs nothing.");
  assert.deepEqual(checkIds(PLAN, noR2).missing, ["R2"]);
  const noKtd1 = PLAN.replace("- KTD1. **Three saved scripts.** Uses 3 refuters on a P1.\n", "");
  const r = checkIds(PLAN, noKtd1);
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ["KTD1"]);
  // R1's definition goes, but "(R1)" in U1 still mentions it.
  const undefinedR1 = checkIds(PLAN, PLAN.replace("- R1. A run keeps CE's method.\n", ""));
  assert.equal(undefinedR1.ok, false);
  assert.deepEqual(undefinedR1.undefinedAfter, ["R1"]);
  assert.deepEqual(undefinedR1.missing, []);
});

test("an added U passes and is listed; an ID kept with a removed note passes", () => {
  const added = PLAN + "\n### U3. A new unit\nMore.\n";
  const r = checkIds(PLAN, added);
  assert.equal(r.ok, true);
  assert.deepEqual(r.added, ["U3"]);
  const removed = PLAN.replace("Builds the bench (R1).", "removed: folded into U2 (finding C4).");
  assert.equal(checkIds(PLAN, removed).ok, true);
});

test("a foreign ID mentioned but never defined by the plan is not its to keep", () => {
  const before = PLAN + "\nAs in the Back Nine's U16 review.\n";
  assert.equal(checkIds(before, PLAN).ok, true);
});

test("a plan with no IDs before the fold fails: nothing checked never reads as a pass", () => {
  const r = checkIds("# A plan\nNo ids here.\n", "# A plan\n");
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /defines no R, U, KTD ID/);
});

test("the grep list holds every amendment's old value class, and drops none quietly", () => {
  const amendments = [
    { id: "D1", old_values: ["3 refuters", "three refuters"] },
    { id: "D2", old_values: ["3  Refuters", "Opus at high"] },
    { id: "D3", old_values: [] },
    { id: "D4", oldValues: ["P1", "x y"] },
  ];
  const list = grepList(amendments);
  assert.deepEqual(list.values.map((v) => v.value), ["3 refuters", "three refuters", "Opus at high"]);
  assert.deepEqual(list.values[0].amendments, ["D1", "D2"], "one value named by two amendments carries both");
  assert.deepEqual(list.addsOnly, ["D3"]);
  assert.deepEqual(list.refused.map((r) => r.value), ["P1", "x y"]);
  // Every old value of every amendment lands in exactly one of the three lists.
  const placed = [...list.values.map((v) => v.value.toLowerCase()), ...list.refused.map((r) => r.value.toLowerCase())];
  for (const a of amendments) for (const o of a.old_values ?? a.oldValues) assert.ok(placed.includes(o.replace(/\s+/g, " ").trim().toLowerCase()), o);
  assert.throws(() => grepList([{ old_values: [] }]), /no id/);
  assert.throws(() => grepList([{ id: "D9" }]), /no old_values list/);
});

test("drift finds every line still carrying an old value, not just the one the amendment named", () => {
  const folded = PLAN.replace("Uses 3 refuters on a P1.", "Uses 4 refuters on a P1.");
  const hits = drift(folded, grepList([{ id: "D1", old_values: ["3 refuters"] }]));
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0].hits.map((h) => h.line), [20]);
  assert.match(hits[0].hits[0].text, /Ports the vote law: 3 refuters/);
  assert.deepEqual(drift(folded.replace("3 refuters on a P1, 2", "4 refuters on a P1, 2"), grepList([{ id: "D1", old_values: ["3 refuters"] }])), []);
});

test("drift matches an old value in any letter case and across doubled spaces", () => {
  const plan = "# P\n- KTD1. Three  Refuters on each P1.\n- KTD2. THREE REFUTERS again.\n";
  const hits = drift(plan, grepList([{ id: "D1", old_values: ["three refuters"] }]));
  assert.deepEqual(hits[0].hits.map((h) => h.line), [2, 3]);
});

test("the command prints its result and exits 1 on a failed ID check, 0 on a pass with drift", (t) => {
  const dir = tmpRoot(t);
  const b = join(dir, "before.md");
  const a = join(dir, "after.md");
  const m = join(dir, "amendments.json");
  writeFileSync(b, PLAN);
  writeFileSync(a, PLAN.replace("Uses 3 refuters on a P1.", "Uses 4 refuters on a P1."));
  writeFileSync(m, JSON.stringify([{ id: "D1", old_values: ["3 refuters"] }]));
  const pass = spawnSync(process.execPath, [join(here, "fold.mjs"), b, a, m], { encoding: "utf8" });
  assert.equal(pass.status, 0, pass.stderr);
  assert.equal(JSON.parse(pass.stdout).driftLines, 1);
  assert.match(pass.stderr, /still appear on 1 line/);
  writeFileSync(a, PLAN.replace("### U2. Core logic", "### U9. Core logic").replace("| U2 |", "| U9 |"));
  const fail = spawnSync(process.execPath, [join(here, "fold.mjs"), b, a], { encoding: "utf8" });
  assert.equal(fail.status, 1);
  assert.deepEqual(JSON.parse(fail.stdout).ids.missing, ["U2"]);
  assert.deepEqual(foldCheck(PLAN, PLAN).ids.problems, []);
});
