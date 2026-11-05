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
const swap = (text, from, to) => {
  assert.ok(text.includes(from), `fixture has no ${JSON.stringify(from)}`);
  return text.replace(from, to);
};
const kindsOf = (text, id) => [...new Set((definitions(text).get(id) ?? []).map((d) => d.kind))].sort();
const lostOf = (r) => r.lost.map((x) => `${x.id} ${x.tier} ${x.before}->${x.after}`);
const HEAD = "heading";
const ONE = "list item, index row or topical heading";

test("the hybrid plan's own IDs are all found, each by its kinds of defining line, and an unchanged plan passes", () => {
  const ids = definedIds(REAL);
  for (const id of ["R1", "R13", "U1", "U11", "KTD1", "KTD24"]) assert.ok(ids.includes(id), id);
  assert.equal(ids.length, 48);
  assert.deepEqual(kindsOf(REAL, "U5"), ["heading", "row"]);
  assert.deepEqual(kindsOf(REAL, "R1"), ["list"], "the diagram's R1 node is no definition");
  assert.equal(checkIds(REAL, REAL).ok, true);
  assert.deepEqual(definedIds(PLAN), ["R1", "R2", "U1", "U2", "KTD1", "KTD2"]);
  assert.deepEqual(kindsOf(PLAN, "U1"), ["heading", "row"], "the prose bullet 'U1 to U2' is no definition");
  assert.equal(checkIds(PLAN, PLAN).before, 6);
  assert.deepEqual(definitions(PLAN).get("U2").map((d) => d.line), [19, 24], "each defining line carries its number");
});

test("dropping a unit's section fails while its index row stays, on the real plan and the fixture", () => {
  const noU5 = REAL.replace(/### U5\.[\s\S]*?(?=### U6\.)/, "");
  const r = checkIds(REAL, noU5);
  assert.equal(r.ok, false);
  assert.deepEqual(lostOf(r), [`U5 ${HEAD} 1->0`]);
  const noU2 = PLAN.replace(/### U2\.[\s\S]*?(?=## Definition)/, "");
  assert.deepEqual(lostOf(checkIds(PLAN, noU2)), [`U2 ${HEAD} 1->0`]);
  assert.match(checkIds(PLAN, noU2).problems.join(" "), /U2 \(1 heading line before, 0 after\)/);
});

test("a renumbered heading fails, naming the old ID, whether or not its row moves with it", () => {
  const headingOnly = swap(PLAN, "### U2. Core logic", "### U3. Core logic");
  assert.deepEqual(lostOf(checkIds(PLAN, headingOnly)), [`U2 ${HEAD} 1->0`]);
  // Heading and row both renumbered: the closing bullet still mentions U2, so it is lost, not gone.
  const both = swap(headingOnly, "| U2 | Core logic |", "| U3 | Core logic |");
  const r = checkIds(PLAN, both);
  assert.equal(r.ok, false);
  assert.deepEqual(lostOf(r), [`U2 ${HEAD} 1->0`]);
  // With that bullet gone too, nothing mentions U2 at all.
  const gone = checkIds(PLAN, swap(both, "- U1 to U2 are done.", "- All done."));
  assert.deepEqual(gone.missing, ["U2"]);
  assert.match(gone.problems.join(" "), /gone after the fold: U2/);
  const real = checkIds(REAL, swap(REAL, "### U7. Head-to-head harness", "### U12. Head-to-head harness"));
  assert.deepEqual(lostOf(real), [`U7 ${HEAD} 1->0`]);
});

test("a deleted R or KTD fails, naming it, even when a diagram or a later line still mentions it", () => {
  // The diagram's "R1 --> U1" and U1's "(R1)" still mention R1: it stays mentioned but loses its list item.
  assert.deepEqual(lostOf(checkIds(PLAN, without(PLAN, "- R1. A run keeps CE's method.\n"))), [`R1 ${ONE} 1->0`]);
  const noR2 = swap(without(PLAN, "- R2. Every helper runs on Opus at xhigh.\n"), "Governs R2.", "Governs nothing.");
  assert.deepEqual(checkIds(PLAN, noR2).missing, ["R2"]);
  const noKtd1 = checkIds(PLAN, without(PLAN, "- KTD1. **Three saved scripts.** Uses 3 refuters on a P1.\n"));
  assert.equal(noKtd1.ok, false);
  assert.deepEqual(noKtd1.missing, ["KTD1"]);
  assert.deepEqual(lostOf(checkIds(REAL, REAL.replace(/^- R1\. .*\n/m, ""))), [`R1 ${ONE} 1->0`]);
});

test("a twin line of the same tier never stands in for a dropped definition", () => {
  // The Back Nine pay-check spec's shape: a Departures list item names KTD1 beside its own entry.
  const departures = PLAN + "\n## Departures\n1. **KTD1: the scripts moved.** See U1.\n";
  const noKtd1 = checkIds(departures, without(departures, "- KTD1. **Three saved scripts.** Uses 3 refuters on a P1.\n"));
  assert.deepEqual(lostOf(noKtd1), [`KTD1 ${ONE} 2->1`]);
  // The tax-floor spec's shape: an as-built heading for U2 beside the unit's own.
  const asBuilt = PLAN + "\n## As built\n### U2 - the measurement\nIt measured.\n";
  const noU2 = asBuilt.replace(/### U2\. Core logic[\s\S]*?(?=## Definition)/, "");
  assert.deepEqual(lostOf(checkIds(asBuilt, noU2)), [`U2 ${HEAD} 2->1`]);
  // Two table rows for one requirement: dropping the requirements row while a trace row stays.
  const rows = "# P\n| ID | What |\n|---|---|\n| R2 | Keep auth |\n\n| ID | Tests |\n|---|---|\n| R2 | U1 tests |\n";
  assert.deepEqual(lostOf(checkIds(rows, without(rows, "| R2 | Keep auth |\n"))), [`R2 ${ONE} 2->1`]);
});

test("below an ID's strongest tier lines may come and go, and a line may move up a tier", () => {
  // The unit index dropped while every unit keeps its heading.
  const noIndex = without(PLAN, "| U-ID | Title |\n|---|---|\n| U1 | Bench |\n| U2 | Core logic |\n");
  assert.equal(checkIds(PLAN, noIndex).ok, true, checkIds(PLAN, noIndex).problems.join(" "));
  assert.equal(checkIds(REAL, REAL.replace(/^\| U\d+ \|.*\n/gm, "")).ok, true, "the real plan without its unit index");
  // Build-record bullets for units with headings, deleted.
  const notes = PLAN + "\n## Build record\n- **U1:** built in abc1234.\n- **U2:** built in def5678.\n";
  assert.equal(checkIds(notes, PLAN).ok, true);
  // The requirements list rendered as a table: list items become rows, one for one.
  const table = swap(PLAN, "- R1. A run keeps CE's method.\n- R2. Every helper runs on Opus at xhigh.\n", "| ID | Requirement |\n|---|---|\n| R1 | A run keeps CE's method. |\n| R2 | Every helper runs on Opus at xhigh. |\n");
  assert.equal(checkIds(PLAN, table).ok, true, checkIds(PLAN, table).problems.join(" "));
  // A requirement promoted to a heading of its own.
  const promoted = swap(PLAN, "- R1. A run keeps CE's method.", "#### R1. A run keeps CE's method.");
  assert.equal(checkIds(PLAN, promoted).ok, true);
  // A unit demoted from its heading to a row is still a loss.
  assert.deepEqual(lostOf(checkIds(PLAN, swap(PLAN, "### U1. Bench", "- U1. Bench"))), [`U1 ${HEAD} 1->0`]);
});

test("editing a diagram or a prose bullet that names an ID is not a lost definition", () => {
  const edited = swap(swap(PLAN, "  R1 --> U1", "  R2 --> U2"), "- U1 to U2 are done.", "- Every unit is done.");
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

test("a fence closes only on its own character at its length or longer, so an inner fence line hides nothing", () => {
  // A ~~~ block showing one ``` line: the ``` line neither closes it nor opens a new fence.
  const mixed = "- R1. one\n~~~markdown\n```js\n~~~\n### U1. First\n### U2. Second\n- R2. two\n";
  assert.deepEqual(definedIds(mixed), ["R1", "R2", "U1", "U2"]);
  assert.deepEqual(checkIds(mixed, without(mixed, "### U2. Second\n- R2. two\n")).missing, ["R2", "U2"]);
  // A four-backtick block holding a three-backtick example: the example's heading stays code.
  const nested = "### U1. Bench\nText.\n````markdown\n```markdown\n### U1. Example\n```\n````\n";
  assert.deepEqual(definitions(nested).get("U1").map((d) => d.line), [1]);
  assert.deepEqual(lostOf(checkIds(nested, without(nested, "### U1. Bench\n"))), [`U1 ${HEAD} 1->0`]);
  // A backtick line with a backtick in its info string opens no fence.
  assert.deepEqual(definedIds("``` a`b\n### U1. Real\n"), ["U1"]);
});

test("a fence left open in either file fails the check: every line after it would read as code", () => {
  const open = PLAN + "\n```text\n### U9. Hidden\n";
  const before = checkIds(open, open);
  assert.equal(before.ok, false);
  assert.match(before.problems.join(" "), /opens a fence at line \d+ that never closes/);
  const after = checkIds(PLAN, PLAN.replace("### U2. Core logic", "```\n### U2. Core logic"));
  assert.equal(after.ok, false);
  assert.match(after.problems.join(" "), /the folded plan opens a fence/);
  // Open before and closed after: U9 appears as added, but nothing after the fence was checked.
  const closed = checkIds(open, PLAN + "\n```text\n```\n### U9. Hidden\n");
  assert.equal(closed.ok, false);
  assert.match(closed.problems.join(" "), /the plan before the fold opens a fence/);
  assert.doesNotMatch(closed.problems.join(" "), /the folded plan opens/);
});

test("the YAML front matter is not prose, and a plan that opens on a thematic break keeps its lines", () => {
  const fm = "---\ntitle: x\nids:\n  - R7. not a requirement\ndeepened: 2026-11-01\n---\n# P\n- R1. one\n";
  assert.deepEqual(definedIds(fm), ["R1"]);
  const rule = "---\nA paragraph, not YAML.\n- R1. one\n---\n# P\n";
  assert.deepEqual(definedIds(rule), ["R1"], "a paragraph is no YAML, so this is no front matter");
});

test("the ID's own spellings: a bare heading, a box, a bold parenthesis, a dotted cell, and never a sub-ID", () => {
  assert.deepEqual(kindsOf("### U5", "U5"), ["heading"]);
  assert.deepEqual(kindsOf("### U5 ", "U5"), ["heading"]);
  assert.deepEqual(definedIds("### U2.5 A sub-unit\n- R1.1 A sub-requirement\n"), [], "U2.5 is no definition of U2");
  assert.deepEqual(kindsOf("- [ ] U1. Bench\n", "U1"), ["list"]);
  assert.deepEqual(kindsOf("- [x] **U1.** Bench\n", "U1"), ["list"]);
  assert.deepEqual(kindsOf("- **R1 (PRD 6.2)** -- a requirement\n", "R1"), ["list"]);
  assert.deepEqual(definedIds("- U3 (lib/x) waits on U2\n"), [], "a parenthesis outside bold is prose");
  assert.deepEqual(kindsOf("| R1. | a requirement |\n", "R1"), ["row"]);
  assert.deepEqual(definedIds("| U1.5 | a sub-unit |\n"), []);
  assert.deepEqual(kindsOf("- **R1** -- a requirement\n", "R1"), ["list"], "the bold close after the ID");
  // A grouped trace bullet mentions its IDs; their definitions live elsewhere.
  assert.deepEqual(definedIds("- **R10, R11, R12** traced to U3\n"), []);
});

test("a heading whose ID runs into a word is a topic, never outranking the ID's own line", () => {
  const dash = String.fromCharCode(0x2014);
  for (const h of ["### U5. Bench", "### U5", "### **U5** Bench", `## U5 ${dash} intake shape`, "## U5 - intake", "## U5 / x", "### U5 removed: merged"]) {
    assert.deepEqual(kindsOf(h + "\n", "U5"), ["heading"], h);
  }
  for (const h of ["### U5 notes", "### U5 (notes)", "### R13 splits - two axes"]) {
    assert.deepEqual(kindsOf(h + "\n", h.match(/U5|R13/)[0]), ["topic"], h);
  }
  // Burned's shape: a discussion heading for R13, and R13's own trace bullet. Dropping the bullet
  // fails; the heading never stands in for it.
  const plan = "# P\n### R13 splits - two axes\nDiscussion.\n## Trace\n- **R13** (PRD 6.2) traced to U4\n";
  assert.deepEqual(lostOf(checkIds(plan, without(plan, "- **R13** (PRD 6.2) traced to U4\n"))), [`R13 ${ONE} 2->1`]);
  // An as-built heading set off by a dash is still a heading twin of the unit.
  assert.deepEqual(kindsOf(`### U4. Floor\n### U4 ${dash} the measurement\n`, "U4"), ["heading"]);
});

test("removed: excuses only right after the ID on a list item too, and a bold parenthesis may sit before it", () => {
  const plan = "# P\n- R1. A rule.\n| R1 | trace |\n";
  // The trace row dropped, and the list item mentions a removal mid-text: no excuse.
  assert.deepEqual(lostOf(checkIds(plan, "# P\n- R1. A rule; the old flag removed: see KTD2.\n")), [`R1 ${ONE} 2->1`]);
  assert.deepEqual(checkIds("# P\n- **R1 (PRD 6.2)** A rule.\n| R1 | trace |\n", "# P\n- **R1 (PRD 6.2)** removed: merged into R2.\n").excused, ["R1"]);
  // A note already in the plan before the fold is kept like any defining line.
  const noted = "# P\n### U7. removed: merged into U1.\n### U1. Bench\nU1 holds U7's work.\n";
  assert.deepEqual(lostOf(checkIds(noted, without(noted, "### U7. removed: merged into U1.\n"))), [`U7 ${HEAD} 1->0`]);
});

test("an added unit passes and is listed; a removed: note right after the ID excuses what it lost", () => {
  const added = checkIds(PLAN, PLAN + "\n### U3. A new unit\nMore.\n");
  assert.equal(added.ok, true);
  assert.deepEqual(added.added, ["U3"]);
  // U1's section goes, its heading kept as a removed note: the heading and row survive.
  const noted = swap(PLAN, "### U1. Bench\nBuilds the bench (R1).", "### U1. removed: folded into U2 (finding C4).");
  assert.equal(checkIds(PLAN, noted).ok, true);
  // U2's heading goes, and only its row says why: the note excuses the lost heading.
  const rowNote = swap(PLAN.replace(/### U2\.[\s\S]*?(?=## Definition)/, ""), "| U2 | Core logic |", "| U2 | removed: merged into U1 |");
  const r = checkIds(PLAN, rowNote);
  assert.equal(r.ok, true, r.problems.join(" "));
  assert.deepEqual(r.excused, ["U2"]);
  // Without the note the same drop fails.
  assert.equal(checkIds(PLAN, PLAN.replace(/### U2\.[\s\S]*?(?=## Definition)/, "")).ok, false);
  // The note excuses only the ID its line defines, never one it mentions: U1's heading drop still fails.
  const alsoU1 = without(rowNote, "### U1. Bench\n");
  assert.deepEqual(lostOf(checkIds(PLAN, alsoU1)), [`U1 ${HEAD} 1->0`]);
  // A bold list item's note, and a heading's note after a space alone, excuse too.
  const bold = "# P\n- **R1.** A rule.\n| R1 | trace |\n";
  assert.deepEqual(checkIds(bold, "# P\n- **R1.** removed: merged into R2.\n").excused, ["R1"]);
  assert.equal(checkIds("### U7. Old\n| U7 | x |\n", "### U7 removed: merged\n").ok, true);
});

test("removed: anywhere but right after the ID excuses nothing", () => {
  // A title that holds the word, copied into its index row as CE's index does.
  const titled = swap(swap(PLAN, "### U2. Core logic", "### U2. Old flags removed: the sweep"), "| U2 | Core logic |", "| U2 | Old flags removed: the sweep |");
  const noU2 = titled.replace(/### U2\.[\s\S]*?(?=## Definition)/, "");
  const r = checkIds(titled, noU2);
  assert.deepEqual(r.excused, []);
  assert.deepEqual(lostOf(r), [`U2 ${HEAD} 1->0`]);
  // A row whose text mentions a removal mid-cell.
  const mid = swap(PLAN, "| U2 | Core logic |", "| U2 | Core logic (v1 removed: see KTD2) |");
  assert.deepEqual(lostOf(checkIds(mid, mid.replace(/### U2\.[\s\S]*?(?=## Definition)/, ""))), [`U2 ${HEAD} 1->0`]);
  // A merge note on the surviving unit names U2 but defines U1: it excuses U1 alone.
  const merged = swap(PLAN.replace(/### U2\.[\s\S]*?(?=## Definition)/, ""), "### U1. Bench", "### U1. Bench (U2 removed: merged here)");
  assert.deepEqual(lostOf(checkIds(PLAN, merged)), [`U2 ${HEAD} 1->0`]);
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
  assert.throws(() => grepList([{ id: "D5", old_values: [null] }]), /not text/);
  assert.throws(() => grepList([{ id: "D6", old_values: [{ v: "3 refuters" }] }]), /not text/);
  assert.throws(() => foldCheck(PLAN, PLAN), /must be a list/, "foldCheck has no default changes list");
});

test("drift finds every line still carrying an old value, not just the one the change named", () => {
  const folded = swap(PLAN, "Uses 3 refuters on a P1.", "Uses 4 refuters on a P1.");
  const hits = drift(folded, grepList([{ id: "D1", old_values: ["3 refuters"] }]));
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0].hits.map((h) => h.line), [25]);
  assert.match(hits[0].hits[0].text, /Ports the vote law: 3 refuters/);
  assert.deepEqual(drift(swap(folded, "3 refuters on a P1, 2", "4 refuters on a P1, 2"), grepList([{ id: "D1", old_values: ["3 refuters"] }])), []);
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
  writeFileSync(a, swap(PLAN, "Uses 3 refuters on a P1.", "Uses 4 refuters on a P1."));
  writeFileSync(m, JSON.stringify([{ id: "D1", old_values: ["3 refuters"] }]));
  const pass = run(b, a, m);
  assert.equal(pass.status, 0, pass.stderr);
  assert.equal(JSON.parse(pass.stdout).driftLines, 1);
  assert.match(pass.stderr, /still appear on 1 line/);
  writeFileSync(a, swap(PLAN, "### U2. Core logic", "### U9. Core logic"));
  const fail = run(b, a, m);
  assert.equal(fail.status, 1);
  assert.deepEqual(lostOf(JSON.parse(fail.stdout).ids), [`U2 ${HEAD} 1->0`]);
  // No changes file: the drift grep would never run, so no check runs at all.
  const none = run(b, a);
  assert.equal(none.status, 2);
  assert.match(none.stderr, /^usage: /m);
  writeFileSync(m, "[]");
  const empty = run(b, a, m);
  assert.equal(empty.status, 2);
  assert.match(empty.stderr, /the changes list is empty/);
  writeFileSync(m, "{not json");
  const bad = run(b, a, m);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /^fold: no check ran/);
  writeFileSync(m, JSON.stringify([{ id: "D1", old_values: [] }]));
  assert.equal(run(b, join(dir, "missing.md"), m).status, 2);
  assert.deepEqual(foldCheck(PLAN, PLAN, []).ids.problems, []);
});
