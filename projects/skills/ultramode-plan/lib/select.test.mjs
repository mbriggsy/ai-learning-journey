import { test } from "node:test";
import assert from "node:assert/strict";
import { CRITICAL_KINDS, selectSections } from "./select.mjs";
import { PLAN_DEPTHS, SECTION_KINDS } from "./caps.mjs";

const sec = (section, triggers, kind = "other", strengthened = false) => ({ section, kind, triggers, strengthened });
// Each section starts at its own level-2 heading, lines 10, 20, 30 and so on, under a level-1 title,
// and the index lists exactly those headings: a full score list, unless a case says otherwise.
const lined = (scores) => (Array.isArray(scores) ? scores.map((s, i) => (s && typeof s === "object" && s.line === undefined ? { ...s, line: 10 * (i + 1) } : s)) : scores);
const indexOf = (scores) => [{ line: 1, level: 1, heading: "Plan" }, ...(Array.isArray(scores) ? scores : []).map((s, i) => ({ line: 10 * (i + 1), level: 2, heading: s?.section }))];
const run = (scores, o = {}) => selectSections({ scores: lined(scores), index: indexOf(scores), depth: "Standard", riskSignals: [], ...o });
const picked = (r) => r.sections.map((s) => s.section);

test("every critical kind is one the scorer's schema can return", () => {
  for (const k of CRITICAL_KINDS) assert.ok(SECTION_KINDS.includes(k), k);
});

test("no section at 2 points gives confidence check passed; one at exactly 2 is a candidate, one at 1 is not", () => {
  const passed = run([sec("Problem Frame", 1, "goal-problem"), sec("Sources", 0, "context-research")]);
  assert.equal(passed.result, "passed");
  assert.deepEqual(passed.sections, []);
  assert.equal(run([sec("Assumptions", 2, "assumptions")]).result, "deepen");
  // One trigger plus the critical bonus is exactly 2 points in a Standard plan.
  const edge = run([sec("Key Technical Decisions", 1, "key-decisions"), sec("Assumptions", 1, "assumptions")]);
  assert.deepEqual(picked(edge), ["Key Technical Decisions"]);
  assert.equal(edge.sections[0].points, 2);
});

test("one candidate deepens one", () => {
  const r = run([sec("A", 0), sec("B", 3), sec("C", 1)]);
  assert.equal(r.result, "deepen");
  assert.deepEqual(picked(r), ["B"]);
  assert.equal(r.candidates, 1);
});

test("seven candidates deepen the top five, by points", () => {
  const r = run([sec("s1", 2), sec("s2", 6), sec("s3", 3), sec("s4", 5), sec("s5", 2), sec("s6", 4), sec("s7", 7)]);
  assert.deepEqual(picked(r), ["s7", "s2", "s4", "s6", "s3"]);
  assert.equal(r.candidates, 7);
  assert.match(r.reason, /5 of 7 candidates deepen \(2 over the cap of 5: s1, s5\)/);
});

test("a tie at the fifth slot goes to CE's critical section, then document order", () => {
  // Four clear winners, then a contest for the fifth slot.
  const base = [sec("w1", 9), sec("w2", 8), sec("w3", 7), sec("w4", 6)];
  const crit = run([...base, sec("t1", 3), sec("t2", 3), sec("Implementation Units", 3, "units")], { depth: "Deep" });
  // In a Deep plan the bonus makes the units section 4 points: it wins outright.
  assert.equal(picked(crit)[4], "Implementation Units");
  const tieOnly = run([...base, sec("t1", 3), sec("t2", 3), sec("Risks", 2, "risks")], { depth: "Standard" });
  // Risks has 2 triggers + 1 bonus = 3 points: tied with t1 and t2 on points, it wins on critical.
  assert.equal(picked(tieOnly)[4], "Risks");
  const doc = run([...base, sec("t1", 3), sec("t2", 3)]);
  assert.equal(picked(doc)[4], "t1", "with no critical section in the tie, document order decides");
});

test("a lightweight high-risk plan caps at two, and a lightweight plan with no risk signal does too", () => {
  const scores = [sec("a", 5), sec("b", 4), sec("c", 3)];
  const hi = run(scores, { depth: "Lightweight", riskSignals: ["payments"] });
  assert.deepEqual(picked(hi), ["a", "b"]);
  assert.equal(hi.cap, 2);
  assert.equal(hi.highRisk, true);
  const lo = run(scores, { depth: "Lightweight", riskSignals: [] });
  assert.deepEqual(picked(lo), ["a", "b"]);
  assert.equal(lo.highRisk, false);
  assert.equal(run(scores, { depth: "Deep", riskSignals: ["payments"] }).sections.length, 3, "a Deep high-risk plan keeps the cap of 5");
});

test("the critical bonus applies in Standard and Deep plans only", () => {
  const scores = [sec("Key Technical Decisions", 1, "key-decisions")];
  assert.equal(run(scores, { depth: "Standard" }).result, "deepen");
  assert.equal(run(scores, { depth: "Deep" }).result, "deepen");
  assert.equal(run(scores, { depth: "Lightweight" }).result, "passed");
});

test("on a plan with a deepened: date, a section not yet strengthened beats a comparable one that was", () => {
  // Cap 2 through a Lightweight plan, so the comparison decides the second slot.
  const lw = (scores) => run(scores, { depth: "Lightweight", deepened: true });
  // Equal points: the one not yet strengthened wins.
  assert.deepEqual(picked(lw([sec("top", 9), sec("old", 3, "other", true), sec("fresh", 3)])), ["top", "fresh"]);
  // One point apart is comparable: the fresh section still wins.
  assert.deepEqual(picked(lw([sec("top", 9), sec("old", 4, "other", true), sec("fresh", 3)])), ["top", "fresh"]);
  // Two points apart is clearly higher: the strengthened section is revisited.
  assert.deepEqual(picked(lw([sec("top", 9), sec("old", 5, "other", true), sec("fresh", 3)])), ["top", "old"]);
  // Without a deepened: date, strengthened flags change nothing.
  assert.deepEqual(picked(run([sec("top", 9), sec("old", 4, "other", true), sec("fresh", 3)], { depth: "Lightweight" })), ["top", "old"]);
});

test("without a deepened: date a strengthened flag neither lowers a section nor breaks a tie", () => {
  const lw = (scores) => run(scores, { depth: "Lightweight" });
  // The flagged section comes later and one point ahead: lowered, it would tie and lose.
  assert.deepEqual(picked(lw([sec("top", 9), sec("fresh", 3), sec("old", 4, "other", true)])), ["top", "old"]);
  // Equal points and first in document order: a strengthened tie-break would pass it over.
  assert.deepEqual(picked(lw([sec("top", 9), sec("old", 3, "other", true), sec("fresh", 3)])), ["top", "old"]);
});

test("a short score list blocks: a part of the plan left unscored, a row at no heading, a heading scored twice, no index", () => {
  const index = [
    { line: 1, level: 1, heading: "Plan" },
    { line: 3, level: 2, heading: "Goal" },
    { line: 9, level: 2, heading: "Planning Contract" },
    { line: 11, level: 3, heading: "Key Technical Decisions" },
    { line: 30, level: 3, heading: "Risks" },
    { line: 40, level: 2, heading: "Implementation Units" },
    { line: 42, level: 3, heading: "U1. Bench" },
    { line: 50, level: 3, heading: "U2. Core" },
  ];
  const full = [
    { section: "Goal", line: 3, kind: "goal-problem", triggers: 0 },
    { section: "Key Technical Decisions", line: 11, kind: "key-decisions", triggers: 2 },
    { section: "Implementation Units", line: 40, kind: "units", triggers: 0 },
  ];
  const go = (scores, idx = index) => selectSections({ scores, index: idx, depth: "Standard", riskSignals: [] });
  // One row covers every unit beneath its heading, and Risks need not have its own row.
  assert.equal(go(full).result, "deepen");
  // The scorer dropped the units part: its zero-trigger rows would otherwise read "passed".
  const short = go(full.slice(0, 2).map((s) => ({ ...s, triggers: 0 })));
  assert.equal(short.result, "blocked");
  assert.match(short.reason, /left 1 part of the plan unscored \("Implementation Units"\)/);
  assert.match(go([...full, { section: "Stray", line: 41, kind: "other", triggers: 0 }]).reason, /line 41, which is no heading/);
  assert.match(go([...full, { section: "Again", line: 11, kind: "other", triggers: 0 }]).reason, /line 11 is scored twice/);
  assert.match(go(full, null).reason, /no section index/);
  assert.match(go(full, [{ line: 0, level: 2 }]).reason, /malformed section index/);
  assert.match(go(full.map(({ line, ...s }) => s)).reason, /its heading's line/);
});

test("every plan depth the scorer's schema allows is one select reads", () => {
  for (const depth of PLAN_DEPTHS) assert.notEqual(run([sec("a", 3)], { depth }).result, "blocked", depth);
});

test("a null score list gives blocked, never passed, and so does every malformed input", () => {
  assert.equal(selectSections({ scores: null, depth: "Standard", riskSignals: [] }).result, "blocked");
  assert.equal(selectSections({ depth: "Standard", riskSignals: [] }).result, "blocked");
  assert.equal(run([]).result, "blocked");
  assert.equal(run("x").result, "blocked");
  assert.equal(run([sec("a", 3)], { depth: "Huge" }).result, "blocked");
  assert.equal(run([sec("a", 3)], { riskSignals: null }).result, "blocked");
  assert.equal(run([{ section: "a", kind: "units", triggers: 1.5 }]).result, "blocked");
  assert.equal(run([{ section: "", kind: "units", triggers: 1 }]).result, "blocked");
  assert.equal(run([sec("a", -1)]).result, "blocked");
  assert.equal(selectSections().result, "blocked");
});

test("the result records the rules it applied and every section's points", () => {
  const r = run([sec("Key Technical Decisions", 2, "key-decisions"), sec("Other", 1)], { deepened: true });
  assert.ok(r.rules.some((x) => /2 points or more/.test(x)));
  assert.ok(r.rules.some((x) => /deepened: date/.test(x)));
  assert.deepEqual(r.scored.map((s) => [s.section, s.points, s.bonus]), [["Key Technical Decisions", 3, 1], ["Other", 1, 0]]);
});
