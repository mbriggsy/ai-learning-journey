import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, fixVerdict, judge, refuterCount, severityLine, tally } from "./vote-law.mjs";

// A vote in the verdict schema's shape. Defaults affirm everything; override what a case needs.
const v = (o = {}) => ({ real: true, material: true, new: true, corrected_severity: "P1", fix_is_correct: true, reasoning: "r", better_fix: "", ...o });
const NOT_REAL = { real: false, material: false, new: false };

test("refuter counts: P0 and P1 get 3, P2 gets 2, P3 gets 1, and anything else throws", () => {
  assert.equal(refuterCount("P0"), 3);
  assert.equal(refuterCount("P1"), 3);
  assert.equal(refuterCount("P2"), 2);
  assert.equal(refuterCount("P3"), 1);
  for (const bad of ["P4", "p1", "", null, undefined, "drop"]) assert.throws(() => refuterCount(bad), /not a severity/);
});

test("tally: a strict majority, a strict minority, exactly half", () => {
  assert.equal(tally(2, 3), "yes");
  assert.equal(tally(1, 3), "no");
  assert.equal(tally(1, 2), "tie");
  assert.equal(tally(0, 1), "no");
  assert.equal(tally(1, 1), "yes");
});

test("no cast votes gives hand-verify, never rejected", () => {
  assert.equal(classify([], 3).status, "hand-verify");
  assert.equal(judge([null, null, null], "P1").status, "hand-verify");
  assert.equal(judge([], "P3").status, "hand-verify");
});

test("a tie on real gives hand-verify", () => {
  assert.equal(judge([v(), v(NOT_REAL)], "P2").status, "hand-verify");
  assert.match(judge([v(), v(NOT_REAL)], "P2").basis, /tie/);
});

test("a majority not real with quorum gives rejected; the same with 1 of 3 votes cast gives hand-verify", () => {
  assert.equal(judge([v(NOT_REAL), v(NOT_REAL), v()], "P1").status, "rejected");
  assert.equal(judge([v(NOT_REAL), v(NOT_REAL), null], "P1").status, "rejected");
  const lone = judge([v(NOT_REAL), null, null], "P1");
  assert.equal(lone.status, "hand-verify");
  assert.match(lone.basis, /would be rejected .* on 1 of 3 votes/);
});

test("a P3's lone verifier calling it not real gives rejected: one vote is its whole quorum", () => {
  assert.equal(judge([v(NOT_REAL)], "P3").status, "rejected");
});

test("a P2 with 1 of 2 votes cast gives hand-verify when that vote would drop it, and confirmed when it affirms", () => {
  assert.equal(judge([v(NOT_REAL), null], "P2").status, "hand-verify");
  assert.equal(judge([null, v({ material: false })], "P2").status, "hand-verify");
  // The quorum guards only the verdicts that drop a finding: every vote that came back affirmed this one.
  assert.equal(judge([v(), null], "P2").status, "confirmed");
});

test("of 3 real-voters, 1 calling it material gives hand-verify; 2 calling it material carries on to confirmed", () => {
  assert.equal(judge([v(), v({ material: false }), v({ material: false })], "P1").status, "hand-verify");
  assert.equal(judge([v(), v(), v({ material: false })], "P1").status, "confirmed");
});

test("every affirmer calling it immaterial gives advisory; a tie on material gives hand-verify", () => {
  assert.equal(judge([v({ material: false }), v({ material: false }), v(NOT_REAL)], "P1").status, "advisory");
  assert.equal(judge([v(), v({ material: false })], "P2").status, "hand-verify");
});

test("real and material with 1 of 3 calling it new gives hand-verify, and with 2 of 3 gives confirmed", () => {
  assert.equal(judge([v(), v({ new: false }), v({ new: false })], "P0").status, "hand-verify");
  assert.equal(judge([v(), v(), v({ new: false })], "P0").status, "confirmed");
});

test("real and material with every affirmer calling it not new gives advisory, and confirmed in the bench mode", () => {
  const votes = [v({ new: false }), v({ new: false }), v({ new: false })];
  assert.equal(judge(votes, "P1").status, "advisory");
  assert.equal(judge(votes, "P1", { bench: true }).status, "confirmed");
});

test("material and new are counted among the real-voters only, never over every cast vote", () => {
  // 2 real-voters (both material, both new) and 1 not-real vote: 2 of 2, not 2 of 3.
  const r = judge([v(), v(), v(NOT_REAL)], "P1");
  assert.equal(r.status, "confirmed");
  assert.equal(r.votes, "real 2/3 - material 2/2 - new 2/2");
});

test("an abstention is never a vote: two crashed verifiers and one affirming vote confirm, and never reject", () => {
  // Read as "not real", the two nulls would make a 1-of-3 majority against and reject the finding.
  const r = judge([null, v(), null], "P1");
  assert.equal(r.status, "confirmed");
  assert.equal(r.cast, 1);
  assert.equal(r.abstained, 2);
  assert.match(r.votes, /abstained 2\/3/);
  // Read as "not real", one null would turn this 1-1 tie into a 1-of-3 rejection.
  assert.equal(judge([v(), v(NOT_REAL), null], "P0").status, "hand-verify");
});

test("a doubled vote, a malformed vote and an impossible n each throw", () => {
  assert.throws(() => judge([v(), v(), v()], "P2"), /doubled vote/);
  assert.throws(() => classify([v(), v()], 1), /doubled vote/);
  assert.throws(() => classify([{ real: "yes", material: true, new: true }], 3), /no boolean "real"/);
  assert.throws(() => classify([{ real: true, material: true }], 3), /no boolean "new"/);
  assert.doesNotThrow(() => classify([{ real: true, material: true }], 3, { bench: true }));
  assert.throws(() => classify([], 0), /whole number/);
});

test("bench mode: 2 of 3 real-voters putting a claimed P1 at P2 drop it below D's line; a 1-1 split on that line is both-ways", () => {
  const below = judge([v({ corrected_severity: "P2" }), v({ corrected_severity: "P2" }), v({ corrected_severity: "P1" })], "P1", { bench: true });
  assert.equal(below.status, "confirmed");
  assert.equal(below.line, "below");
  const split = judge([v({ corrected_severity: "P1" }), v({ corrected_severity: "P2" }), v(NOT_REAL)], "P1", { bench: true });
  assert.equal(split.status, "confirmed");
  assert.equal(split.line, "both");
  const above = judge([v({ corrected_severity: "P0" }), v({ corrected_severity: "P1" }), v({ corrected_severity: "P3" })], "P1", { bench: true });
  assert.equal(above.line, "above");
  // A not-real vote's severity never counts: only real-voters set the line.
  assert.equal(severityLine([v({ corrected_severity: "P2" })]), "below");
  assert.equal(severityLine([]), null);
  assert.equal(judge([v()], "P3").line, undefined, "the line is a bench-mode field");
});

test("fix verdict: a majority right applies it; a majority wrong with one better fix applies that; a split or several better fixes hand-verify", () => {
  assert.equal(fixVerdict([v(), v(), v({ fix_is_correct: false, better_fix: "B" })]).action, "apply");
  const better = fixVerdict([v({ fix_is_correct: false, better_fix: "B" }), v({ fix_is_correct: false, better_fix: " B " }), v()]);
  assert.equal(better.action, "apply-better");
  assert.equal(better.betterFix, "B");
  assert.equal(fixVerdict([v(), v({ fix_is_correct: false, better_fix: "B" })]).action, "hand-verify");
  const two = fixVerdict([v({ fix_is_correct: false, better_fix: "B" }), v({ fix_is_correct: false, better_fix: "C" }), v()]);
  assert.equal(two.action, "hand-verify");
  assert.deepEqual(two.betterFixes, ["B", "C"]);
  assert.equal(fixVerdict([v({ fix_is_correct: false }), v({ fix_is_correct: false }), v()]).action, "hand-verify");
  assert.equal(fixVerdict([]).action, "hand-verify");
  // judge carries it, counted over the cast votes only.
  assert.equal(judge([v({ fix_is_correct: false, better_fix: "B" }), null, null], "P1").fix.action, "apply-better");
});
