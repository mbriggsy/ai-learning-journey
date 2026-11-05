// SECTION SELECTION (KTD5 step 2 of docs/plans/hybrid-plan-step-plan.md): which sections the
// deepen strengthens, decided by code from the scorer's return, so the same scores always pick
// the same sections. The rules are CE's (ce-plan's references/deepening-workflow.md 5.3.3, read
// on 3.35.3), made deterministic where CE leaves a judgment:
//   - a section's points are its trigger count, plus 1 for a critical section in a Standard or
//     Deep plan; 2 points or more makes a candidate;
//   - up to 5 candidates deepen, so exactly 1 deepens 1, and none means "confidence check passed";
//   - a lightweight plan caps at 2. KTD5 names the high-risk lightweight plan; CE deepens a
//     lightweight plan only as that high-risk exception, and since our scorer always runs, a
//     lightweight plan with no risk signal gets the same cap of 2, never the general 5;
//   - on a plan that already carries a `deepened:` date, a section already strengthened ranks
//     one point lower, and loses an equal rank to one not yet strengthened. That is CE's
//     "prefer sections not yet strengthened when their scores are comparable; revisit one only
//     when it still scores clearly higher", with "comparable" fixed at one point and "clearly
//     higher" at two;
//   - remaining ties go to CE's critical sections, then document order.
// A missing or malformed score list is "blocked", never "passed": a crashed scorer must not read
// as a plan that needed nothing (KTD5).
//
// Pure and import-free: U5's generator inlines this file into the deepen script.

// CE's critical sections (deepening-workflow.md 5.3.3), as the scorer's section kinds
// (caps.mjs SECTION_KINDS, which the tests check holds every one of these).
export const CRITICAL_KINDS = ["key-decisions", "units", "system-impact", "risks", "open-questions"];

const selectBlocked = (reason) => ({ result: "blocked", reason, sections: [], candidates: 0, cap: null, rules: [] });

// `scores`: the scorer's sections in document order, each { section, kind, triggers, strengthened }.
// `depth`: "Lightweight", "Standard" or "Deep". `riskSignals`: CE's high-risk signals the scorer
// found (caps.mjs RISK_SIGNALS); any one makes the plan high-risk. `deepened`: the plan already
// carries a `deepened:` date.
export function selectSections({ scores, depth, riskSignals, deepened = false } = {}) {
  if (scores === null || scores === undefined) return selectBlocked("no score list: the scorer crashed or returned nothing, which never reads as passed");
  if (!Array.isArray(scores) || scores.length === 0) return selectBlocked("an empty or malformed score list: no section was scored");
  if (!["Lightweight", "Standard", "Deep"].includes(depth)) return selectBlocked(`no plan depth (got ${JSON.stringify(depth)}): the cap and the critical bonus depend on it`);
  if (!Array.isArray(riskSignals)) return selectBlocked("no risk-signal list: the lightweight cap and the check's high-risk flag depend on it");
  for (const [i, s] of scores.entries()) {
    if (!s || typeof s.section !== "string" || !s.section.trim() || typeof s.kind !== "string" || !Number.isInteger(s.triggers) || s.triggers < 0) {
      return selectBlocked(`section ${i + 1} is malformed (${JSON.stringify(s)}): every section needs a name, a kind and a whole trigger count`);
    }
  }
  const bonusApplies = depth !== "Lightweight";
  const cap = depth === "Lightweight" ? 2 : 5;
  const rows = scores.map((s, index) => {
    const critical = CRITICAL_KINDS.includes(s.kind);
    const bonus = critical && bonusApplies ? 1 : 0;
    const points = s.triggers + bonus;
    const strengthened = s.strengthened === true;
    return { index, section: s.section, kind: s.kind, triggers: s.triggers, bonus, points, critical, strengthened, rank: points - (deepened && strengthened ? 1 : 0) };
  });
  const rules = [
    `a candidate scores 2 points or more: its triggers${bonusApplies ? ", plus 1 for a critical section (this plan is " + depth + ")" : " (no critical bonus on a Lightweight plan)"}`,
    depth === "Lightweight" ? "cap 2: a lightweight plan" : "cap 5",
    ...(deepened ? ["the plan already carries a deepened: date: a strengthened section ranks one point lower and loses an equal rank to one not yet strengthened"] : []),
    "ties: a critical section first, then document order",
  ];
  const candidates = rows.filter((r) => r.points >= 2);
  const highRisk = riskSignals.length > 0;
  if (candidates.length === 0) return { result: "passed", reason: "no section scored 2 points or more: confidence check passed", sections: [], candidates: 0, cap, highRisk, rules, scored: rows };
  const order = [...candidates].sort(
    (a, b) =>
      b.rank - a.rank ||
      (deepened ? Number(a.strengthened) - Number(b.strengthened) : 0) ||
      Number(b.critical) - Number(a.critical) ||
      a.index - b.index,
  );
  const sections = order.slice(0, cap);
  const left = order.length - sections.length;
  return {
    result: "deepen",
    reason: `${sections.length} of ${order.length} candidate${order.length === 1 ? "" : "s"} deepen${left ? ` (${left} over the cap of ${cap}: ${order.slice(cap).map((r) => r.section).join(", ")})` : ""}`,
    sections,
    candidates: order.length,
    cap,
    highRisk,
    rules,
    scored: rows,
  };
}
