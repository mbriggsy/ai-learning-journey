// THE VOTE LAW (KTD8 of docs/plans/hybrid-plan-step-plan.md), ported from ultramode-code-review's
// `refuterCount`, `tally` and `classify` (projects/skills/ultramode-code-review/references/
// workflow-template.md), with its tests, plus two things the port source has no use for: the
// bench mode KTD19's judges vote under, and the fix verdict KTD9's fold reads.
//
// Pure and import-free: U5's generator inlines this file into every Workflow script, so it reads
// no file, no clock and no random number, and every top-level name stays unique across lib/.
//
// The three words, for a check finding and a deepen amendment alike:
//   real      the gap exists and its evidence holds in source
//   material  it changes what gets built or how it is verified
//   new       the plan does not already say or address it
// An abstention (a verifier that crashed or never answered, agent() -> null) is never a vote,
// and real, material and new are tallied separately, never as one majority over the
// conjunction (Back Nine insights 019 and 077).

export const SEVERITIES = ["P0", "P1", "P2", "P3"];

// How many verifiers a finding gets: 3 on P0 and P1, 2 on P2, 1 on P3. A severity outside the
// four throws; the port source quietly gave anything else one verifier.
export function refuterCount(severity) {
  if (severity === "P0" || severity === "P1") return 3;
  if (severity === "P2") return 2;
  if (severity === "P3") return 1;
  throw new Error(`refuterCount: ${JSON.stringify(severity)} is not a severity (P0, P1, P2 or P3)`);
}

// 'yes' a strict majority, 'no' a strict minority, 'tie' exactly half.
export const tally = (yes, of) => (2 * yes > of ? "yes" : 2 * yes < of ? "no" : "tie");

// THE LAW -> { status, basis }. `cast` holds only the votes that came back; `n` is how many
// verifiers the severity asked for (refuterCount). Statuses:
//   confirmed    real, material and new (in the bench mode, real and material)
//   advisory     real, but every verifier who affirmed it graded it immaterial, or (outside the
//                bench mode) every one of them says the plan already covers it
//   rejected     a majority of the cast votes traced it as not real
//   hand-verify  the main loop traces it to source itself; never rejected, never advisory
// Hand-verify on exactly:
//   (1) no cast votes;
//   (2) a tie on real;
//   (3) once real: a tie on material, or any real-voter calling it material while most do not;
//   (4) once real and material (not in the bench mode): a tie on new, or any real-voter calling it
//       new while most do not;
//   (5) a would-be rejected or advisory verdict resting on fewer cast votes than the severity
//       quorum min(2, n): a P0, P1 or P2 left with one vote after the rest abstained (a P3's lone
//       verifier is its whole quorum).
// Every other split follows its majority. A confirmed verdict needs no quorum: every vote that
// came back affirmed it, and the quorum guards only the verdicts that would drop a finding.
export function classify(cast, n, { bench = false } = {}) {
  if (!Array.isArray(cast)) throw new Error("classify: cast must be an array of the votes that came back");
  if (!Number.isInteger(n) || n < 1) throw new Error(`classify: ${JSON.stringify(n)} verifiers asked; n must be a whole number of at least 1`);
  if (cast.length > n) throw new Error(`classify: ${cast.length} votes cast for ${n} verifiers asked (a doubled vote)`);
  cast.forEach((v, i) => {
    const fields = bench ? ["real", "material"] : ["real", "material", "new"];
    for (const f of fields) {
      if (!v || typeof v[f] !== "boolean") throw new Error(`classify: vote ${i + 1} has no boolean "${f}" (an abstention is filtered out before classify, never passed in)`);
    }
  });
  if (cast.length === 0) return { status: "hand-verify", basis: "no votes: every verifier crashed or never answered (an abstention, not a refutation; resume the run or trace it by hand)" };
  const quorum = Math.min(2, n);
  const demote = (status, basis) =>
    cast.length < quorum
      ? { status: "hand-verify", basis: `would be ${status} (${basis}), but on ${cast.length} of ${n} votes: the rest abstained, below the severity quorum of ${quorum}` }
      : { status, basis };
  const realVoters = cast.filter((v) => v.real);
  const R = realVoters.length;
  const real = tally(R, cast.length);
  if (real === "no") return demote("rejected", "a majority of the cast votes traced it as not real");
  if (real === "tie") return { status: "hand-verify", basis: "split on whether it is real: a tie is not a refutation" };
  const M = realVoters.filter((v) => v.material).length;
  const material = tally(M, R);
  if (material === "tie" || (material === "no" && M > 0)) return { status: "hand-verify", basis: "agreed real, split on whether it is material: the project-values call is the main loop's (insight 077)" };
  if (material === "no") return demote("advisory", "real, and every verifier who affirmed it graded it immaterial");
  if (bench) return { status: "confirmed", basis: "REAL x MATERIAL (bench mode: new is not asked)" };
  const F = realVoters.filter((v) => v.new).length;
  const fresh = tally(F, R);
  if (fresh === "tie" || (fresh === "no" && F > 0)) return { status: "hand-verify", basis: "real and material, split on whether the plan already covers it: a newness split never defers a real finding (insight 077)" };
  if (fresh === "no") return demote("advisory", "real and material, and every verifier who affirmed it says the plan already covers it");
  return { status: "confirmed", basis: "NEW x REAL x MATERIAL" };
}

// What KTD9's fold does with the proposed change, judged by the verifiers who affirmed the
// finding real (the same voters material and new are counted among): a verifier who found nothing
// to fix has no say in how to fix it. It never applies a fix a majority of them judged wrong.
// 'apply' the proposed fix; 'apply-better' the one better fix offered; 'hand-verify' on a split,
// or when a majority judged it wrong and offered no better fix or more than one (whether two
// worded fixes agree is a judgment, so the lead makes it).
export function fixVerdict(realVoters) {
  if (!Array.isArray(realVoters) || realVoters.length === 0) return { action: "hand-verify", basis: "no verifier affirmed the finding, so none judged its change", betterFixes: [] };
  const n = realVoters.length;
  const right = realVoters.filter((v) => v.fix_is_correct === true).length;
  const t = tally(right, n);
  const betterFixes = [...new Set(realVoters.filter((v) => v.fix_is_correct !== true).map((v) => String(v.better_fix ?? "").trim()).filter((s) => s.length > 0))];
  if (t === "yes") return { action: "apply", basis: `${right} of ${n} real-voters judged the proposed change right`, betterFixes };
  if (t === "tie") return { action: "hand-verify", basis: `split on the proposed change: ${right} of ${n} real-voters judged it right`, betterFixes };
  if (betterFixes.length === 1) return { action: "apply-better", basis: `${n - right} of ${n} real-voters judged the proposed change wrong, with one better fix`, betterFix: betterFixes[0], betterFixes };
  return {
    action: "hand-verify",
    basis: betterFixes.length
      ? `a majority judged the proposed change wrong and offered ${betterFixes.length} different better fixes`
      : "a majority judged the proposed change wrong and offered no better fix",
    betterFixes,
  };
}

// Bench mode only (KTD8, KTD17): is a confirmed defect P0 or P1 for D? Only when a majority of
// its real-voters put it there; a tie on that line is counted both ways, like a hand-verify split.
// 'above' (P0 or P1), 'below', 'both', or null when no verifier affirmed it real.
export function severityLine(realVoters) {
  if (!Array.isArray(realVoters) || realVoters.length === 0) return null;
  const high = realVoters.filter((v) => v.corrected_severity === "P0" || v.corrected_severity === "P1").length;
  const t = tally(high, realVoters.length);
  return t === "yes" ? "above" : t === "no" ? "below" : "both";
}

// One finding's whole verdict from its raw verifier results, nulls included. THE ABSTENTION
// FILTER lives here: a null is a verifier that never answered, dropped before any count, so it
// can never read as "not real". `votes` holds at most refuterCount(severity) entries; a missing
// entry is an abstention too.
export function judge(votes, severity, { bench = false } = {}) {
  const n = refuterCount(severity);
  if (!Array.isArray(votes)) throw new Error("judge: votes must be an array (null for a verifier that never answered)");
  if (votes.length > n) throw new Error(`judge: ${votes.length} votes for a ${severity}, which asks ${n} (a doubled vote)`);
  const cast = votes.filter(Boolean);
  const { status, basis } = classify(cast, n, { bench });
  const realVoters = cast.filter((v) => v.real);
  const M = realVoters.filter((v) => v.material).length;
  const F = realVoters.filter((v) => v.new).length;
  const abstained = n - cast.length;
  const out = {
    status,
    basis,
    asked: n,
    cast: cast.length,
    abstained,
    votes: `real ${realVoters.length}/${cast.length} - material ${M}/${realVoters.length}${bench ? "" : ` - new ${F}/${realVoters.length}`}${abstained ? ` - abstained ${abstained}/${n}` : ""}`,
    votedSeverity: cast.map((v) => v.corrected_severity ?? null),
    // Each cast vote's evidence, for the hand-verify pile and KTD24's re-score.
    reasons: cast.map((v) => v.reasoning ?? ""),
    fix: fixVerdict(realVoters),
  };
  if (bench) out.line = severityLine(realVoters);
  return out;
}
