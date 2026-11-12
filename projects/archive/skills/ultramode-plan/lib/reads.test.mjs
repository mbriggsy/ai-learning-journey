import { test } from "node:test";
import assert from "node:assert/strict";
import { READS_KINDS, readsArgs, readsCeFile, readsCeProblem, readsIndexProblem, readsInventory, readsIsPath, readsLastProblem, readsMissed, readsNotes, readsRerun, readsSections } from "./reads.mjs";
import { PROMPT_PAGE, PROMPT_QUOTE_FLOOR, promptShortRead } from "./prompts.mjs";

// A plan's section index, as flow.mjs index builds it: a title, two units with a same-named child
// each (two sections may share a heading), and a last section. Spans: Goal 5-19, Units 20-69, U1
// 22-39, its Approach 24-39, U2 40-69, its Approach 42-69, Risks 70-90.
const INDEX = [
  { line: 1, level: 1, heading: "The plan", own: true },
  { line: 5, level: 2, heading: "Goal", own: true },
  { line: 20, level: 2, heading: "Units", own: true },
  { line: 22, level: 3, heading: "U1. First", own: false },
  { line: 24, level: 4, heading: "Approach", own: true },
  { line: 40, level: 3, heading: "U2. Second", own: false },
  { line: 42, level: 4, heading: "Approach", own: true },
  { line: 70, level: 2, heading: "Risks", own: true },
];
// The last line ends on an indented line (15 of 105 committed plans do).
const TEXT = "- **The last line of this plan, which runs long enough** to test the quote floor";
const LAST = { line: 90, text: `    ${TEXT}  ` };
const ALL = [
  { line: 5, heading: "Goal" },
  { line: 20, heading: "Units" },
  { line: 22, heading: "U1. First" },
  { line: 24, heading: "Approach" },
  { line: 40, heading: "U2. Second" },
  { line: 42, heading: "Approach" },
  { line: 70, heading: "Risks" },
];
const gate = (extra = {}) => ({ last: LAST, index: INDEX, endsAt: LAST.line, page: PROMPT_PAGE, floor: PROMPT_QUOTE_FLOOR, ...extra });
const inv = (extra = {}) => ({ last_line_number: 90, last_line_text: TEXT.slice(0, 120), pages_read: 1, ...extra });
// promptShortRead's built object, as a whole-plan reader's builder returns it.
const built = (schema = "scorer", endsAt = LAST.line) => ({ prompt: "THE READER'S PROMPT", schema, endsAt });

test("a whole inventory passes: the last line's number, a quote that is its prefix, and enough pages", () => {
  assert.deepEqual(readsInventory(inv(), gate()), { ok: true });
  assert.deepEqual(readsInventory(inv({ last_line_text: TEXT }), gate()), { ok: true });
});

test("the quote is a prefix of the true last line, both ends trimmed, at least min(length, the floor) characters: 40 passes, 39 fails", () => {
  const q40 = TEXT.slice(0, PROMPT_QUOTE_FLOOR);
  assert.equal(PROMPT_QUOTE_FLOOR, 40);
  assert.notEqual(q40.at(-1), " ", "a 40-character quote that ends in a space would trim to 39 and test nothing");
  assert.deepEqual(readsInventory(inv({ last_line_text: q40 }), gate()), { ok: true });
  // The line's indentation dropped, or kept: both ends are trimmed.
  assert.deepEqual(readsInventory(inv({ last_line_text: `    ${q40}` }), gate()), { ok: true });
  assert.deepEqual(readsInventory(inv({ last_line_text: `${q40}\t ` }), gate()), { ok: true });
  const q39 = readsInventory(inv({ last_line_text: TEXT.slice(0, 39) }), gate());
  assert.deepEqual(q39.reasons, ["inventory"]);
  assert.deepEqual(q39.problems, ["last_line_text holds 39 characters trimmed, under the 40 the check needs"]);
  // Another line, and one past the end of the true line, are no prefix.
  assert.deepEqual(readsInventory(inv({ last_line_text: "- **The first line of the plan, which is long enough" }), gate()).problems, ["last_line_text is no prefix of the plan's last line"]);
  assert.deepEqual(readsInventory(inv({ last_line_text: `${TEXT} and more` }), gate()).problems, ["last_line_text is no prefix of the plan's last line"]);
  // A stretch from the line's middle is in it, but no prefix of it.
  assert.deepEqual(readsInventory(inv({ last_line_text: TEXT.slice(4, 60) }), gate()).problems, ["last_line_text is no prefix of the plan's last line"]);
  // The floor is the input, never a copy: at 41 the 40-character quote fails.
  assert.deepEqual(readsInventory(inv({ last_line_text: q40 }), gate({ floor: 41 })).problems, ["last_line_text holds 40 characters trimmed, under the 41 the check needs"]);
});

test("a last line shorter than the floor needs the whole line", () => {
  const last = { line: 90, text: "  Done.\r" };
  const g = gate({ last });
  assert.deepEqual(readsInventory(inv({ last_line_text: "Done." }), g), { ok: true });
  assert.deepEqual(readsInventory(inv({ last_line_text: "Done" }), g).problems, ["last_line_text holds 4 characters trimmed, under the 5 the check needs"]);
  assert.deepEqual(readsInventory(inv({ last_line_text: "" }), g).problems, ["last_line_text holds 0 characters trimmed, under the 5 the check needs"]);
});

test("pages_read is at least ceil(N / the page size): exactly that passes, one under fails", () => {
  const one = [{ line: 1, level: 1, heading: "Only", own: true }];
  const at = (line, pages) => readsInventory(inv({ last_line_number: line, pages_read: pages }), gate({ last: { line, text: TEXT }, index: one, endsAt: line }));
  // 1,059 lines (the pay-check spec): ceil(1059 / 160) is 7.
  assert.deepEqual(at(1059, 7), { ok: true });
  assert.deepEqual(at(1059, 6).problems, ["pages_read 6 is under 7, the fewest pages of 160 lines that reach line 1059"]);
  assert.deepEqual(at(160, 1), { ok: true });
  assert.deepEqual(at(161, 1).problems, ["pages_read 1 is under 2, the fewest pages of 160 lines that reach line 161"]);
  assert.deepEqual(at(161, 2), { ok: true });
  // The page size is the input too.
  assert.deepEqual(readsInventory(inv({ last_line_number: 161, pages_read: 1 }), gate({ last: { line: 161, text: TEXT }, index: one, endsAt: 161, page: 200 })), { ok: true });
});

test("a number past N, a field left out, or no inventory at all fails as inventory, naming every section as missed", () => {
  const past = readsInventory(inv({ last_line_number: 91 }), gate());
  assert.deepEqual(past, { ok: false, reasons: ["inventory"], missed: ALL, problems: ["last_line_number 91 is past the plan's last line (90)"] });
  assert.deepEqual(readsInventory(inv({ last_line_number: undefined }), gate()).problems, ["no last_line_number"]);
  assert.deepEqual(readsInventory(inv({ last_line_text: undefined }), gate()).problems, ["no last_line_text"]);
  assert.deepEqual(readsInventory(inv({ pages_read: undefined }), gate()).problems, ["no pages_read"]);
  for (const bad of [-1, 1.5, "90"]) assert.deepEqual(readsInventory(inv({ last_line_number: bad }), gate()).reasons, ["inventory"], JSON.stringify(bad));
  for (const none of [null, undefined, "text", [1, 2]]) {
    const r = readsInventory(none, gate());
    assert.deepEqual(r, { ok: false, reasons: ["inventory"], missed: ALL, problems: ["no last_line_number", "no last_line_text", "no pages_read"] }, JSON.stringify(none));
  }
});

test("no refusal holds the last line's text, which a quote is checked against", () => {
  const words = [TEXT.slice(0, 20), TEXT.slice(-20)];
  for (const answer of [inv({ last_line_number: 91 }), inv({ last_line_text: "nothing like it" }), inv({ last_line_text: TEXT.slice(0, 39) }), inv({ pages_read: 0 }), inv({ last_line_number: 12 }), null]) {
    const r = readsInventory(answer, gate());
    for (const w of words) assert.ok(!JSON.stringify(r.problems).includes(w), `a refusal holds the last line: ${JSON.stringify(r.problems)}`);
  }
});

test("a number under N is a stop, whatever else is wrong, and it misses every section whose span runs past it", () => {
  // Inside U1's Approach: U1, its Approach and their parent Units run past 30; Goal ends at 19.
  const r = readsInventory(inv({ last_line_number: 30, last_line_text: "garbage", pages_read: 0 }), gate());
  assert.deepEqual(r, {
    ok: false,
    reasons: ["stopped"],
    stoppedAt: 30,
    missed: [{ line: 20, heading: "Units" }, { line: 22, heading: "U1. First" }, { line: 24, heading: "Approach" }, { line: 40, heading: "U2. Second" }, { line: 42, heading: "Approach" }, { line: 70, heading: "Risks" }],
    problems: ["it read to line 30, under the plan's last line (90)"],
  });
  // N - 1, and a stop inside the last section, still name that section.
  assert.deepEqual(readsInventory(inv({ last_line_number: 89 }), gate()).missed, [{ line: 70, heading: "Risks" }]);
  assert.deepEqual(readsInventory(inv({ last_line_number: 75 }), gate()).missed, [{ line: 70, heading: "Risks" }]);
  // 0 (no line quoted) misses them all; the title is never a section.
  assert.deepEqual(readsInventory(inv({ last_line_number: 0 }), gate()).missed, ALL);
});

test("a stop on a section's last line misses its parent and what follows, not the section itself", () => {
  assert.deepEqual(readsMissed(INDEX, 90, 39), [{ line: 20, heading: "Units" }, { line: 40, heading: "U2. Second" }, { line: 42, heading: "Approach" }, { line: 70, heading: "Risks" }]);
  // A stop on a heading's own line has read none of its section.
  assert.deepEqual(readsMissed(INDEX, 90, 70), [{ line: 70, heading: "Risks" }]);
  assert.deepEqual(readsMissed(INDEX, 90, 69), [{ line: 70, heading: "Risks" }]);
  assert.deepEqual(readsMissed(INDEX, 90, 4), ALL);
});

test("the title is no section, but a plan of two top-level parts has no title", () => {
  assert.deepEqual(readsSections(INDEX, 90).map((s) => [s.line, s.to]), [[5, 19], [20, 69], [22, 39], [24, 39], [40, 69], [42, 69], [70, 90]]);
  const two = [{ line: 1, level: 1, heading: "Part one", own: true }, { line: 9, level: 1, heading: "Part two", own: true }, { line: 12, level: 2, heading: "", own: true }];
  assert.deepEqual(readsSections(two, 20), [{ line: 1, heading: "Part one", to: 8 }, { line: 9, heading: "Part two", to: 20 }, { line: 12, heading: "(a heading with no text)", to: 20 }]);
  // One heading alone is a section.
  assert.deepEqual(readsMissed([{ line: 3, level: 2, heading: "Alone", own: true }], 10, 5), [{ line: 3, heading: "Alone" }]);
  // The index's order does not matter.
  assert.deepEqual(readsSections([...INDEX].reverse(), 90), readsSections(INDEX, 90));
});

test("a malformed index, last line, endsAt, page size or floor throws, naming it", () => {
  assert.throws(() => readsInventory(inv(), gate({ endsAt: 89 })), /endsAt \(89\) is not the plan's last line \(90\)/);
  assert.throws(() => readsInventory(inv(), gate({ index: [] })), /non-empty list/);
  assert.throws(() => readsInventory(inv(), gate({ index: [{ line: 1, level: 1, heading: "x" }] })), /\{ line, level, heading, own \}/);
  assert.throws(() => readsInventory(inv(), gate({ index: [INDEX[1], INDEX[1]] })), /lists line 5 twice/);
  assert.throws(() => readsInventory(inv(), gate({ index: [...INDEX, { line: 95, level: 2, heading: "Late", own: true }] })), /heading at line 95, past the plan's last line \(90\)/);
  assert.throws(() => readsInventory(inv(), gate({ last: { line: 90, text: "  " } })), /last line holding text/);
  assert.throws(() => readsInventory(inv(), gate({ page: 0 })), /the page size is a whole number/);
  assert.throws(() => readsInventory(inv(), gate({ floor: undefined })), /the quote floor is a whole number/);
  assert.throws(() => readsMissed(INDEX, 90, -1), /stoppedAt is the last line a read reached/);
  assert.equal(readsIndexProblem(INDEX), null);
  assert.equal(readsLastProblem(LAST), null);
  assert.match(readsIndexProblem([{ line: 1, level: 7, heading: "x", own: true }]), /\{ line, level, heading, own \}/);
});

test("the scorer's notes join the selected rows by line, so two sections with one heading stay apart, and a blank note is none", () => {
  const selected = [{ section: "Approach", line: 24 }, { section: "Approach", line: 42 }, { section: "Risks", line: 70 }];
  const notes = [
    { line: 42, section: "Approach", triggers_named: "no rollback named" },
    { line: 24, section: "Approach", triggers_named: "   " },
    { line: 70, section: "Risks", triggers_named: "a risk with no owner" },
    { line: 70, section: "Risks", triggers_named: " no trigger " },
    { line: 5, section: "Goal", triggers_named: "a note no selected row starts at" },
  ];
  assert.deepEqual(readsNotes({ selected, notes, index: INDEX }), {
    noted: [{ line: 42, heading: "Approach", triggers: "no rollback named" }, { line: 70, heading: "Risks", triggers: "a risk with no owner; no trigger" }],
    noNote: [{ line: 24, heading: "Approach" }],
  });
  // No notes at all, or a note keyed by the right name at the wrong line, leaves every row with none.
  assert.deepEqual(readsNotes({ selected, notes: undefined, index: INDEX }).noNote.map((r) => r.line), [24, 42, 70]);
  assert.deepEqual(readsNotes({ selected: [selected[1]], notes: [{ line: 24, section: "Approach", triggers_named: "x" }], index: INDEX }).noNote, [{ line: 42, heading: "Approach" }]);
  assert.deepEqual(readsNotes({ selected: [], notes, index: INDEX }), { noted: [], noNote: [] });
  assert.throws(() => readsNotes({ selected: [{ line: 23 }], notes, index: INDEX }), /starts at a heading of the index/);
  assert.throws(() => readsNotes({ selected: [selected[0], selected[0]], notes, index: INDEX }), /line 24 is selected twice/);
  assert.throws(() => readsNotes({ selected, notes: "x", index: INDEX }), /notes is the scorer's list/);
});

test("the re-run's options: a stop names its line and what it missed, a failed inventory names nothing, notes name their rows, and a whole read with every note is no re-run", () => {
  const stopped = readsInventory(inv({ last_line_number: 75 }), gate());
  const failed = readsInventory(inv({ pages_read: 0 }), gate());
  const whole = readsInventory(inv(), gate());
  const none = { noted: [], noNote: [] };
  const some = { noted: [], noNote: [{ line: 24, heading: "Approach" }] };
  assert.equal(readsRerun(whole), null);
  assert.equal(readsRerun(whole, none), null);
  assert.deepEqual(readsRerun(whole, some), { reasons: ["notes"], noNote: some.noNote });
  assert.deepEqual(readsRerun(stopped), { reasons: ["stopped"], stoppedAt: 75, missed: [{ line: 70, heading: "Risks" }] });
  assert.deepEqual(readsRerun(stopped, some), { reasons: ["stopped", "notes"], stoppedAt: 75, missed: [{ line: 70, heading: "Risks" }], noNote: some.noNote });
  assert.deepEqual(readsRerun(failed), { reasons: ["inventory"] });
  assert.deepEqual(readsRerun(failed, some), { reasons: ["inventory", "notes"], noNote: some.noNote });
  assert.throws(() => readsRerun(null), /readsInventory's answer/);
  // promptShortRead takes every one of them, and each kind READS_KINDS names is the whole of its list.
  for (const opts of [readsRerun(whole, some), readsRerun(stopped), readsRerun(stopped, some), readsRerun(failed), readsRerun(failed, some)]) {
    const r = promptShortRead(built(), opts);
    assert.ok(r.prompt.endsWith("THE READER'S PROMPT"));
    assert.ok(!r.prompt.includes(TEXT.slice(0, 20)), "a re-run prompt holds the last line's text");
  }
  assert.ok(promptShortRead(built("finder"), readsRerun(stopped)).prompt.includes("STOPPED SHORT at line 75"));
  assert.throws(() => promptShortRead(built(), { reasons: ["bogus"] }), new RegExp(`one of: ${READS_KINDS.join(", ")}\\)`));
});

// ---------------------------------------------------------------- the CE files

test("a CE file's path comes from the resolution by its key, null when it is missing; an unknown key or a malformed resolution throws", () => {
  const ce = { commit: "a".repeat(40), absent: null, files: [
    { key: "coherence", file: "x/coherence-reviewer.md", seats: ["coherence"], path: "C:/ce/x/coherence-reviewer.md", sha256: "f".repeat(64) },
    { key: "design", file: "x/design-lens-reviewer.md", seats: ["design"], path: "C:/ce/x/design-lens-reviewer.md", missing: "not in the install" },
  ] };
  assert.equal(readsCeFile(ce, "coherence"), "C:/ce/x/coherence-reviewer.md");
  assert.equal(readsCeFile(ce, "design"), null);
  assert.throws(() => readsCeFile(ce, "feasibility"), /lists no file keyed "feasibility"/);
  // CE absent: every file missing, every path null.
  assert.equal(readsCeFile({ commit: null, absent: "no registry", files: [{ key: "coherence", path: null, missing: "CE absent" }] }, "coherence"), null);
  assert.equal(readsCeProblem(ce), null);
  assert.match(readsCeProblem({ files: [] }), /files list included/);
  assert.match(readsCeProblem(null), /files list included/);
  assert.match(readsCeProblem({ files: [ce.files[0], ce.files[0]] }), /lists coherence twice/);
  assert.match(readsCeProblem({ files: [{ key: "coherence", path: "C:/x", sha256: "f", missing: "both" }] }), /exactly one of sha256 and missing/);
  assert.match(readsCeProblem({ files: [{ key: "coherence", path: "C:/x" }] }), /exactly one of sha256 and missing/);
  assert.match(readsCeProblem({ files: [{ key: "coherence", path: "x/rel.md", sha256: "f" }] }), /has a sha256 but no absolute path/);
  assert.match(readsCeProblem({ files: [{ path: "C:/x", sha256: "f" }] }), /names its key/);
  assert.throws(() => readsCeFile({ files: [] }, "coherence"), /^Error: reads: the CE resolution/);
  for (const p of ["C:/x", "C:\\x", "/x", "d:/y"]) assert.equal(readsIsPath(p), true, p);
  for (const p of ["x", "./x", "C:x", "", null, 3]) assert.equal(readsIsPath(p), false, String(p));
});

// ---------------------------------------------------------------- the args check

const SPEC = {
  who: "deepen",
  required: { plan: "path", index: readsIndexProblem, brief: "text?", lastLine: readsLastProblem },
  optional: { dry: "bool", skip: "list", count: "int" },
};
const ARGS = { plan: "C:/runs/plan.md", index: INDEX, brief: "the brief", lastLine: LAST };

test("args arrive as an object or as a JSON string and come back as the same object", () => {
  assert.deepEqual(readsArgs(ARGS, SPEC), ARGS);
  assert.deepEqual(readsArgs(JSON.stringify(ARGS), SPEC), ARGS);
  assert.deepEqual(readsArgs({ ...ARGS, brief: null, dry: true, skip: [], count: 0 }, SPEC), { ...ARGS, brief: null, dry: true, skip: [], count: 0 });
  assert.deepEqual(readsArgs({ ...ARGS, plan: "/home/x/plan.md", dry: undefined }, SPEC), { ...ARGS, plan: "/home/x/plan.md", dry: undefined });
  assert.deepEqual(readsArgs({ ...ARGS, plan: "C:\\runs\\plan.md" }, SPEC).plan, "C:\\runs\\plan.md");
});

test("every missing or wrong field is refused in one error headed by the script's name, before anything runs", () => {
  assert.throws(() => readsArgs("{not json", SPEC), /^Error: deepen: args arrived as text that is no JSON \(.+\); pass the args object$/);
  assert.throws(() => readsArgs(undefined, SPEC), /^Error: deepen: no args; it needs plan, index, brief, lastLine$/);
  assert.throws(() => readsArgs("null", SPEC), /^Error: deepen: no args/);
  assert.throws(() => readsArgs([ARGS], SPEC), /deepen: args is an object; got a list/);
  assert.throws(() => readsArgs(3, SPEC), /deepen: args is an object; got number/);
  assert.throws(() => readsArgs({ index: INDEX, lastLine: LAST }, SPEC), /^Error: deepen: args\.plan is required; args\.brief is required$/);
  assert.throws(() => readsArgs({ ...ARGS, plan: "runs/plan.md" }, SPEC), /^Error: deepen: args\.plan is an absolute path$/);
  assert.throws(() => readsArgs({ ...ARGS, plan: null }, SPEC), /^Error: deepen: args\.plan is an absolute path, not null$/);
  assert.throws(() => readsArgs({ ...ARGS, brief: "  " }, SPEC), /^Error: deepen: args\.brief is non-empty text or null$/);
  assert.throws(() => readsArgs({ ...ARGS, index: [] }, SPEC), /^Error: deepen: args\.index: the section index is a non-empty list/);
  assert.throws(() => readsArgs({ ...ARGS, lastLine: { line: 3 } }, SPEC), /^Error: deepen: args\.lastLine: the plan's last line is \{ line, text \}/);
  assert.throws(() => readsArgs({ ...ARGS, dry: "yes" }, SPEC), /^Error: deepen: args\.dry is true or false$/);
  assert.throws(() => readsArgs({ ...ARGS, count: -1 }, SPEC), /args\.count is a whole number, 0 or more/);
  assert.throws(() => readsArgs({ ...ARGS, count: 1.5 }, SPEC), /args\.count is a whole number, 0 or more/);
  assert.throws(() => readsArgs({ ...ARGS, skip: "premise" }, SPEC), /args\.skip is a list/);
  // A misspelt optional field is refused, never dropped in silence.
  assert.throws(() => readsArgs({ ...ARGS, dyr: true }, SPEC), /^Error: deepen: args\.dyr is no field this script takes \(it takes: plan, index, brief, lastLine, dry, skip, count\)$/);
  // Two problems of different kinds come together.
  assert.throws(() => readsArgs({ index: INDEX, brief: null, lastLine: LAST, dry: 1 }, SPEC), /^Error: deepen: args\.plan is required; args\.dry is true or false$/);
  assert.throws(() => readsArgs({ x: null }, { who: "t", required: { x: "any" } }), /^Error: t: args\.x is a value, not null$/);
  assert.deepEqual(readsArgs({ x: 0 }, { who: "t", required: { x: "any" } }), { x: 0 });
});

test("a malformed spec throws even while its field is absent", () => {
  assert.throws(() => readsArgs(ARGS, { ...SPEC, optional: { dry: "boolean" } }), /"boolean" is no args kind/);
  assert.throws(() => readsArgs(ARGS, { ...SPEC, optional: { dry: 3 } }), /an args kind is a word/);
  assert.throws(() => readsArgs(ARGS, { ...SPEC, optional: { plan: "path" } }), /plan is both required and optional/);
  assert.throws(() => readsArgs(ARGS, { required: {} }), /who is the script's name/);
});
