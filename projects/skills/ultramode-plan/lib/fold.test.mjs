import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkIds, definedIds, definitions, drift, foldCheck, grepList } from "./fold.mjs";
import { tmpRoot } from "../bench/testkit.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REAL = readFileSync(join(here, "..", "docs", "plans", "hybrid-plan-step-plan.md"), "utf8");

// A small plan in CE's unified shape: R-IDs as a list, KTDs as bold list items, units as headings
// and as an index table, a diagram naming R1, and a prose bullet naming a range of units.
const PLAN = `# Plan

### Requirements
- R1. A run keeps CE's method.
- R2. Every helper runs on Opus at xhigh.

### Key Technical Decisions
- KTD1. **Three saved scripts.** Uses 3 refuters on a P1.
- KTD2. **CE files from the registry.** Governs R2.

\`\`\`mermaid
flowchart TB
  R1 --> U1
\`\`\`

| U-ID | Title |
|---|---|
| U1 | Bench |
| U2 | Core logic |

### U1. Bench
Builds the bench (R1).

### U2. Core logic
Ports the vote law: 3 refuters on a P1, 2 on a P2.

## Definition of Done
- U1 to U2 are done.
`;
const without = (text, line) => {
  assert.ok(text.includes(line), `fixture has no ${JSON.stringify(line)}`);
  return text.replace(line, "");
};

test("the hybrid plan's own IDs are all found, each by its kinds of defining line, and an unchanged plan passes", () => {
  const ids = definedIds(REAL);
  for (const id of ["R1", "R13", "U1", "U11", "KTD1", "KTD24"]) assert.ok(ids.includes(id), id);
  assert.equal(ids.length, 48);
  assert.deepEqual([...definitions(REAL).get("U5")].sort(), ["heading", "row"]);
  assert.deepEqual([...definitions(REAL).get("R1")], ["list"], "the diagram's R1 node is no definition");
  assert.equal(checkIds(REAL, REAL).ok, true);
  assert.deepEqual(definedIds(PLAN), ["R1", "R2", "U1", "U2", "KTD1", "KTD2"]);
  assert.deepEqual([...definitions(PLAN).get("U1")].sort(), ["heading", "row"], "the prose bullet 'U1 to U2' is no definition");
  assert.equal(checkIds(PLAN, PLAN).before, 6);
});

test("dropping a unit's section fails while its index row stays, on the real plan and the fixture", () => {
  const noU5 = REAL.replace(/### U5\.[\s\S]*?(?=### U6\.)/, "");
  const r = checkIds(REAL, noU5);
  assert.equal(r.ok, false);
  assert.deepEqual(r.lost, [{ id: "U5", kinds: ["heading"] }]);
  const noU2 = PLAN.replace(/### U2\.[\s\S]*?(?=## Definition)/, "");
  assert.deepEqual(checkIds(PLAN, noU2).lost, [{ id: "U2", kinds: ["heading"] }]);
});

test("a renumbered heading fails, naming the old ID, whether or not its row moves with it", () => {
  const headingOnly = PLAN.replace("### U2. Core logic", "### U3. Core logic");
  assert.deepEqual(checkIds(PLAN, headingOnly).lost, [{ id: "U2", kinds: ["heading"] }]);
  // Heading and row both renumbered: the closing bullet still mentions U2, so it is lost, not gone.
  const both = headingOnly.replace("| U2 | Core logic |", "| U3 | Core logic |");
  const r = checkIds(PLAN, both);
  assert.equal(r.ok, false);
  assert.deepEqual(r.lost.map((x) => [x.id, x.kinds.sort()]), [["U2", ["heading", "row"]]]);
  // With that bullet gone too, nothing mentions U2 at all.
  const gone = checkIds(PLAN, both.replace("- U1 to U2 are done.", "- All done."));
  assert.deepEqual(gone.missing, ["U2"]);
  assert.match(gone.problems.join(" "), /gone after the fold: U2/);
  const real = checkIds(REAL, REAL.replace("### U7. Head-to-head harness", "### U12. Head-to-head harness"));
  assert.deepEqual(real.lost, [{ id: "U7", kinds: ["heading"] }]);
});

test("a deleted R or KTD fails, naming it, even when a diagram or a later line still mentions it", () => {
  // The diagram's "R1 --> U1" and U1's "(R1)" still mention R1: it stays mentioned but loses its list item.
  assert.deepEqual(checkIds(PLAN, without(PLAN, "- R1. A run keeps CE's method.\n")).lost, [{ id: "R1", kinds: ["list"] }]);
  const noR2 = without(PLAN, "- R2. Every helper runs on Opus at xhigh.\n").replace("Governs R2.", "Governs nothing.");
  assert.deepEqual(checkIds(PLAN, noR2).missing, ["R2"]);
  const noKtd1 = checkIds(PLAN, without(PLAN, "- KTD1. **Three saved scripts.** Uses 3 refuters on a P1.\n"));
  assert.equal(noKtd1.ok, false);
  assert.deepEqual(noKtd1.missing, ["KTD1"]);
  assert.deepEqual(checkIds(REAL, REAL.replace(/^- R1\. .*\n/m, "")).lost, [{ id: "R1", kinds: ["list"] }]);
});

test("editing a diagram or a prose bullet that names an ID is not a lost definition", () => {
  const edited = PLAN.replace("  R1 --> U1", "  R2 --> U2").replace("- U1 to U2 are done.", "- Every unit is done.");
  assert.equal(checkIds(PLAN, edited).ok, true);
});

test("a fenced code block never defines an ID, so cutting an example from it loses nothing", () => {
  const example = "\n```markdown\n### U9. An example unit\n- R9. An example requirement\n```\n";
  assert.deepEqual(definedIds(PLAN + example), definedIds(PLAN));
  assert.equal(checkIds(PLAN + example, PLAN).ok, true);
  // The same lines outside a fence do define, and cutting them fails.
  const bare = PLAN + "\n### U9. A real unit\n- R9. A real requirement\n";
  assert.deepEqual(checkIds(bare, PLAN).missing, ["R9", "U9"]);
});

test("an added unit passes and is listed; a removed: line beside the ID excuses what it lost", () => {
  const added = checkIds(PLAN, PLAN + "\n### U3. A new unit\nMore.\n");
  assert.equal(added.ok, true);
  assert.deepEqual(added.added, ["U3"]);
  // U1's section goes, its heading kept as a removed note: the heading and row survive.
  const noted = PLAN.replace("### U1. Bench\nBuilds the bench (R1).", "### U1. removed: folded into U2 (finding C4).");
  assert.equal(checkIds(PLAN, noted).ok, true);
  // U2's heading goes, and only its row says why: the note excuses the lost heading.
  const rowNote = PLAN.replace(/### U2\.[\s\S]*?(?=## Definition)/, "").replace("| U2 | Core logic |", "| U2 | removed: merged into U1 |");
  const r = checkIds(PLAN, rowNote);
  assert.equal(r.ok, true, r.problems.join(" "));
  assert.deepEqual(r.excused, ["U2"]);
  // Without the note the same drop fails.
  assert.equal(checkIds(PLAN, PLAN.replace(/### U2\.[\s\S]*?(?=## Definition)/, "")).ok, false);
  // The note excuses only the ID its line defines, never one it mentions: U1's heading drop still fails.
  const alsoU1 = rowNote.replace("### U1. Bench\n", "");
  assert.deepEqual(checkIds(PLAN, alsoU1).lost, [{ id: "U1", kinds: ["heading"] }]);
});

test("a foreign ID mentioned but never defined by the plan is not its to keep", () => {
  assert.equal(checkIds(PLAN + "\nAs in the Back Nine's U16 review.\n", PLAN).ok, true);
});

test("CE's origin IDs (A, F, AE) are kept like R, U and KTD, and AE is never read as A", () => {
  const plan = "# P\n- R1. x\n- AE1. An acceptance example.\n- F2. A key flow.\n- A3. An origin requirement.\n";
  assert.deepEqual(definedIds(plan), ["R1", "A3", "F2", "AE1"]);
  assert.deepEqual(checkIds(plan, without(plan, "- AE1. An acceptance example.\n")).missing, ["AE1"]);
});

test("a plan with no IDs before the fold fails: nothing checked never reads as a pass", () => {
  const r = checkIds("# A plan\nNo ids here.\n", "# A plan\n");
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /defines no R, U, KTD, A, F or AE ID/);
});

test("the grep list holds every change's old values, and drops none quietly", () => {
  const changes = [
    { id: "D1", old_values: ["3 refuters", "three refuters"] },
    { id: "D2", old_values: ["3  Refuters", "Opus at high"] },
    { id: "D3", old_values: [] },
    { id: "D4", oldValues: ["P1", "x y"] },
  ];
  const list = grepList(changes);
  assert.deepEqual(list.values.map((v) => v.value), ["3 refuters", "three refuters", "Opus at high"]);
  assert.deepEqual(list.values[0].changes, ["D1", "D2"], "one value named by two changes carries both");
  assert.deepEqual(list.addsOnly, ["D3"]);
  assert.deepEqual(list.refused.map((r) => r.value), ["P1", "x y"]);
  // Every old value of every change lands in exactly one of the lists.
  const placed = [...list.values.map((v) => v.value.toLowerCase()), ...list.refused.map((r) => r.value.toLowerCase())];
  for (const a of changes) for (const o of a.old_values ?? a.oldValues) assert.ok(placed.includes(o.replace(/\s+/g, " ").trim().toLowerCase()), o);
  assert.throws(() => grepList([{ old_values: [] }]), /no id/);
  assert.throws(() => grepList([{ id: "D9" }]), /no old_values list/);
  assert.throws(() => grepList({}), /must be a list/);
});

test("drift finds every line still carrying an old value, not just the one the change named", () => {
  const folded = PLAN.replace("Uses 3 refuters on a P1.", "Uses 4 refuters on a P1.");
  const hits = drift(folded, grepList([{ id: "D1", old_values: ["3 refuters"] }]));
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0].hits.map((h) => h.line), [25]);
  assert.match(hits[0].hits[0].text, /Ports the vote law: 3 refuters/);
  assert.deepEqual(drift(folded.replace("3 refuters on a P1, 2", "4 refuters on a P1, 2"), grepList([{ id: "D1", old_values: ["3 refuters"] }])), []);
});

test("drift matches an old value in any letter case and across doubled spaces", () => {
  const plan = "# P\n- KTD1. Three  Refuters on each P1.\n- KTD2. THREE REFUTERS again.\n";
  const hits = drift(plan, grepList([{ id: "D1", old_values: ["three refuters"] }]));
  assert.deepEqual(hits[0].hits.map((h) => h.line), [2, 3]);
});

test("the command exits 0 on a pass with drift, 1 on a failed ID check, and 2 when it cannot read its input", (t) => {
  const dir = tmpRoot(t);
  const b = join(dir, "before.md");
  const a = join(dir, "after.md");
  const m = join(dir, "changes.json");
  const run = (...args) => spawnSync(process.execPath, [join(here, "fold.mjs"), ...args], { encoding: "utf8" });
  writeFileSync(b, PLAN);
  writeFileSync(a, PLAN.replace("Uses 3 refuters on a P1.", "Uses 4 refuters on a P1."));
  writeFileSync(m, JSON.stringify([{ id: "D1", old_values: ["3 refuters"] }]));
  const pass = run(b, a, m);
  assert.equal(pass.status, 0, pass.stderr);
  assert.equal(JSON.parse(pass.stdout).driftLines, 1);
  assert.match(pass.stderr, /still appear on 1 line/);
  writeFileSync(a, PLAN.replace("### U2. Core logic", "### U9. Core logic"));
  const fail = run(b, a);
  assert.equal(fail.status, 1);
  assert.deepEqual(JSON.parse(fail.stdout).ids.lost, [{ id: "U2", kinds: ["heading"] }]);
  assert.match(fail.stderr, /no changes file was given/);
  writeFileSync(m, "{not json");
  const bad = run(b, a, m);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /^fold: no check ran/);
  assert.equal(run(b, join(dir, "missing.md")).status, 2);
  assert.deepEqual(foldCheck(PLAN, PLAN).ids.problems, []);
});
