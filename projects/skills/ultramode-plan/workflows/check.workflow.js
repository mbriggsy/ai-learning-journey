export const meta = {
  name: 'ultramode-plan-check',
  description: 'ultramode-plan check stage: every seat reads the whole plan, every finding goes to severity-scaled verifiers (KTD6 to KTD9)',
  whenToUse: 'Launched by the ultramode-plan skill with args its run record builds; never by hand.',
  phases: [
    { title: 'Check', detail: 'every seat in the roster reads the whole plan, re-run once when its read is short' },
    { title: 'Verify', detail: 'severity-scaled verifiers vote on each finding as soon as its seat returns' },
  ],
}

// GENERATED from src/check.src.js by lib/make-scripts.mjs: never edit this file. Edit the source or the lib/ modules it inlines (vote-law, caps, prompts, reads), then run: node lib/make-scripts.mjs write

// ---------------------------------------------------------------- inlined from lib/vote-law.mjs (edit the module, then run: node lib/make-scripts.mjs write)
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

const SEVERITIES = ["P0", "P1", "P2", "P3"];

// How many verifiers a finding gets: 3 on P0 and P1, 2 on P2, 1 on P3. A severity outside the
// four throws; the port source quietly gave anything else one verifier.
function refuterCount(severity) {
  if (severity === "P0" || severity === "P1") return 3;
  if (severity === "P2") return 2;
  if (severity === "P3") return 1;
  throw new Error(`refuterCount: ${JSON.stringify(severity)} is not a severity (P0, P1, P2 or P3)`);
}

// 'yes' a strict majority, 'no' a strict minority, 'tie' exactly half.
const tally = (yes, of) => (2 * yes > of ? "yes" : 2 * yes < of ? "no" : "tie");

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
function classify(cast, n, { bench = false } = {}) {
  if (typeof bench !== "boolean") throw new Error(`classify: bench is true or false, got ${JSON.stringify(bench)} (a string "false" would switch the bench mode on)`);
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
function fixVerdict(realVoters) {
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

// Is a confirmed defect P0 or P1? Only when a majority of its real-voters put it there; a tie on
// that line is counted both ways, like a hand-verify split. 'above' (P0 or P1), 'below', 'both', or
// null when no verifier affirmed it real. Two readers: the bench mode, for KTD17's D (KTD8), and the
// deepen's premise gate (KTD5's As-built note, U4's R4-26), where only 'above' ends the deepen and a
// finding at 'below' or 'both' goes on to the check.
function severityLine(realVoters) {
  if (!Array.isArray(realVoters) || realVoters.length === 0) return null;
  const high = realVoters.filter((v) => v.corrected_severity === "P0" || v.corrected_severity === "P1").length;
  const t = tally(high, realVoters.length);
  return t === "yes" ? "above" : t === "no" ? "below" : "both";
}

// One finding's whole verdict from its raw verifier results, nulls included. THE ABSTENTION
// FILTER lives here: a null is a verifier that never answered, dropped before any count, so it
// can never read as "not real". `votes` holds at most refuterCount(severity) entries; a missing
// entry is an abstention too.
function judge(votes, severity, { bench = false } = {}) {
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
// ---------------------------------------------------------------- end of lib/vote-law.mjs

// ---------------------------------------------------------------- inlined from lib/caps.mjs (edit the module, then run: node lib/make-scripts.mjs write)
// THE SIZE TABLE (U2 of docs/plans/hybrid-plan-step-plan.md; Back Nine insight 084). One table
// feeds every schema's maxItems, maxLength and maximum, and every size-law line, so a prompt's
// budget and its schema's cap cannot drift apart.
//
// Pure and import-free: U5's generator inlines this file into every Workflow script, so it reads
// no file, no clock and no random number, and every top-level name stays unique across lib/.
//
// Why caps: an oversized StructuredOutput call is cut after its first property, fails
// validation, and every retry is cut the same way until the helper dies at the retry cap. The
// schema is the enforcement; the prompt's size-law line is only advisory (insight 084's U16
// refinement: prose budgets alone lost 4 of 42 helpers).
// Why caps above the budgets: a helper that writes a little past a cap equal to its budget fails
// validation and retries, and tight caps caused retry storms in past runs, so every string's cap
// is 25% above the budget its prompt states. A list's cap equals its budget: a helper counts its
// own items exactly, and one more allowed item costs a whole item's characters.
// Why 6,000 characters for the whole call: ultramode-code-review's schemas, whose maximal call
// is about 5,300 characters by their own comment, are the ones that ran clean in insight 084's
// U16 re-run; that run's failing schema allowed about 16,000. The real threshold is unmeasured.
// A maximal legal call under these caps stays at or under PAYLOAD (tested), and U6's smoke run
// records each schema's largest real call. Both figures count a string's characters before JSON
// escaping, as the port source's 5,300 does: a quote, backslash or newline takes two characters
// in the call itself, so a call heavy in them can pass the stated ceiling while inside its caps.

// Each entry is a budget: `chars` for a string (its cap is 25% above), `items` for a list (its
// cap is the same), `max` for a whole number (its cap is the same).
const SIZE = {
  // The finder: every check seat, the premise seat and every adversary.
  findings: { items: 4 },
  title: { chars: 80 },
  section: { chars: 64 },
  why: { chars: 360 },
  fix: { chars: 320 },
  overflow: { items: 3 },
  overflowItem: { chars: 80 },
  residual: { items: 2 },
  residualItem: { chars: 160 },
  // The paging inventory every whole-plan reader returns (KTD7): the last line read, by number
  // and by its first characters, and how many Read calls it took.
  line: { max: 99999 },
  lastLineText: { chars: 120 },
  pages: { max: 999 },
  // The verdict: every verifier, of findings and of deepen amendments alike.
  reasoning: { chars: 400 },
  betterFix: { chars: 240 },
  // The scorer (KTD5).
  sections: { items: 24 },
  sectionName: { chars: 36 },
  triggers: { max: 30 },
  notes: { items: 8 },
  triggersNamed: { chars: 160 },
  riskSignals: { items: 7 },
  // A deepen research helper's amendments (KTD5); old_values feed fold.mjs's drift grep (KTD9).
  amendments: { items: 4 },
  // The gap an amendment closes, with its plan line, which its verifiers judge (U4's R4-9). Sized to
  // keep a maximal amendment call under PAYLOAD (5,918 characters, tested).
  gap: { chars: 80 },
  change: { chars: 400 },
  evidence: { chars: 320 },
  oldValues: { items: 3 },
  oldValue: { chars: 60 },
  // A research helper's gist (KTD4).
  gist: { chars: 600 },
  dossier: { chars: 260 },
};

// The ceiling every size-law line states for one whole call, in characters of JSON.
const PAYLOAD = 6000;

// The schema-side value of an entry, and the prompt-side value.
function capOf(key) {
  const e = SIZE[key];
  if (!e) throw new Error(`caps: no size entry "${key}"`);
  if (e.chars !== undefined) return Math.ceil((e.chars * 5) / 4);
  if (e.items !== undefined) return e.items;
  return e.max;
}
function budgetOf(key) {
  const e = SIZE[key];
  if (!e) throw new Error(`caps: no size entry "${key}"`);
  return e.chars ?? e.items ?? e.max;
}

const capString = (key) => ({ type: "string", maxLength: capOf(key) });
const capList = (key, items) => ({ type: "array", maxItems: capOf(key), items });
const capWhole = (key) => ({ type: "integer", minimum: 0, maximum: capOf(key) });
const capObject = (properties) => ({ type: "object", properties, required: Object.keys(properties) });

// The scorer's section kinds: CE's checklist sections (deepening-workflow.md 5.3.3), then the four
// checklists we add (KTD5), then a catch-all. select.mjs names which of them are critical.
const SECTION_KINDS = [
  "requirements", "context-research", "key-decisions", "open-questions", "design", "units", "system-impact", "risks", "docs-ops",
  "goal-problem", "assumptions", "verification", "done",
  "other",
];
// CE's seven high-risk signals (final-review.md 5.3.1). A plan with any of them is high-risk.
const RISK_SIGNALS = ["security", "payments", "data-migration", "external-api", "privacy", "parity", "rollout"];
const PLAN_DEPTHS = ["Lightweight", "Standard", "Deep"];

const CAPS_INVENTORY = {
  last_line_number: capWhole("line"),
  last_line_text: capString("lastLineText"),
  pages_read: capWhole("pages"),
};

// Every schema puts its required fields first, so a call cut after its first property still
// carries one and fails loud on content, not on a missing property (insight 084).
const SCHEMAS = {
  finder: {
    type: "object",
    properties: {
      findings: capList("findings", capObject({
        title: capString("title"),
        severity: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
        section: capString("section"),
        line: capWhole("line"),
        confidence: { type: "integer", enum: [0, 25, 50, 75, 100] },
        why_it_matters: capString("why"),
        suggested_fix: capString("fix"),
      })),
      overflow: capList("overflow", capString("overflowItem")),
      residual_risks: capList("residual", capString("residualItem")),
      ...CAPS_INVENTORY,
      // The premise seat's word, on an update only, that it judged the goal (U4's R4-30): false when
      // no source states one. U5 reads it fail-closed on an update (left out counts as false), and U6
      // turns false into a premise holes entry. Other seats leave it out. It adds 20 characters to a
      // maximal call (5,557, tested under PAYLOAD).
      goal_judged: { type: "boolean" },
    },
    required: ["findings"],
  },
  verdict: {
    type: "object",
    properties: {
      real: { type: "boolean" },
      material: { type: "boolean" },
      new: { type: "boolean" },
      corrected_severity: { type: "string", enum: ["P0", "P1", "P2", "P3", "drop"] },
      fix_is_correct: { type: "boolean" },
      reasoning: capString("reasoning"),
      better_fix: capString("betterFix"),
    },
    required: ["real", "material", "new", "corrected_severity", "fix_is_correct", "reasoning", "better_fix"],
  },
  scorer: {
    type: "object",
    properties: {
      sections: capList("sections", capObject({
        section: capString("sectionName"),
        // The heading line the section starts at, from the section index in args (KTD7), so
        // select.mjs can count the scores against the whole plan.
        line: capWhole("line"),
        kind: { type: "string", enum: SECTION_KINDS },
        triggers: capWhole("triggers"),
        strengthened: { type: "boolean" },
      })),
      depth: { type: "string", enum: PLAN_DEPTHS },
      risk_signals: capList("riskSignals", { type: "string", enum: RISK_SIGNALS }),
      // A note carries its row's line first: the run joins it to the row selection picks by line,
      // since two sections can share a name (U4's R4-6).
      notes: capList("notes", capObject({ line: capWhole("line"), section: capString("sectionName"), triggers_named: capString("triggersNamed") })),
      ...CAPS_INVENTORY,
    },
    required: ["sections", "depth", "risk_signals"],
  },
  amendment: {
    type: "object",
    properties: {
      amendments: capList("amendments", capObject({
        section: capString("section"),
        gap: capString("gap"),
        severity: { type: "string", enum: ["P1", "P2"] },
        change: capString("change"),
        evidence: capString("evidence"),
        old_values: capList("oldValues", capString("oldValue")),
      })),
      // An external researcher's word that outside research ran (U4's R4-19), read fail-closed by U5:
      // left out or false, its section's outside gap is a coverage hole. Other agents leave it out.
      outside_ran: { type: "boolean" },
      overflow: capList("overflow", capString("overflowItem")),
    },
    required: ["amendments"],
  },
  gist: {
    type: "object",
    properties: {
      gist: capString("gist"),
      dossier: capString("dossier"),
      changes_a_decision: { type: "boolean" },
    },
    required: ["gist", "dossier", "changes_a_decision"],
  },
};

const CAPS_LAW = "STRUCTURED-OUTPUT SIZE LAW: a call bigger than its schema allows is cut after its first field and fails, every retry is cut the same way, and a helper that dies at the retry cap";
// 6000 -> "6,000", without toLocaleString, whose output depends on the runtime's locale data.
const capsGrouped = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const CAPS_LAW_END = `The whole call stays under ${capsGrouped(PAYLOAD)} characters. Depth belongs in your working text before the call; the call is the summary, not the essay.`;
const CAPS_INVENTORY_LAW = `last_line_text: the first ${budgetOf("lastLineText")} characters of the last line holding text you read, as Read returned it, without its line-number prefix`;

// The size-law line each prompt that emits a schema call carries, built from the same table.
const SIZE_LAWS = {
  finder: `${CAPS_LAW} certifies nothing. At most ${budgetOf("findings")} findings (fewer and deeper beats many and shallow; name further concrete ones in overflow: at most ${budgetOf("overflow")} titles of at most ${budgetOf("overflowItem")} characters). Per finding: title at most ${budgetOf("title")} characters, section ${budgetOf("section")}, why_it_matters ${budgetOf("why")}, suggested_fix ${budgetOf("fix")}. At most ${budgetOf("residual")} residual_risks of at most ${budgetOf("residualItem")} characters. ${CAPS_INVENTORY_LAW}. goal_judged: the premise seat's only, on an update: false when no source states a goal, true when it judged one. ${CAPS_LAW_END}`,
  verdict: `${CAPS_LAW} turns your vote into an abstention. reasoning at most ${budgetOf("reasoning")} characters, citing file:line or the plan's line; better_fix at most ${budgetOf("betterFix")} characters, or '' when the proposed change is right. ${CAPS_LAW_END}`,
  scorer: `${CAPS_LAW} stops the deepen as blocked. At most ${budgetOf("sections")} sections, each named in at most ${budgetOf("sectionName")} characters, with the line of the index heading it starts at; at most ${budgetOf("notes")} notes, one per section scoring 2 points or more (past ${budgetOf("notes")}, the ${budgetOf("notes")} that rank highest), each with its row's line and naming its triggers in at most ${budgetOf("triggersNamed")} characters. ${CAPS_INVENTORY_LAW}. ${CAPS_LAW_END}`,
  amendment: `${CAPS_LAW} proposes nothing. At most ${budgetOf("amendments")} amendments (name further ones in overflow: at most ${budgetOf("overflow")} titles of at most ${budgetOf("overflowItem")} characters). Per amendment: section at most ${budgetOf("section")} characters, gap ${budgetOf("gap")} (the gap it closes, with its plan line), change ${budgetOf("change")}, evidence ${budgetOf("evidence")}, at most ${budgetOf("oldValues")} old_values of at most ${budgetOf("oldValue")} characters each. outside_ran: an external researcher's only, true when a web search ran and every page cited as read was fetched. ${CAPS_LAW_END}`,
  gist: `${CAPS_LAW} returns nothing. gist at most ${budgetOf("gist")} characters; dossier is the dossier's absolute path, at most ${budgetOf("dossier")} characters. ${CAPS_LAW_END}`,
};

// Every problem that would let a schema carry an unbounded call, or put a required field after
// an optional one. An empty list means the schema is capped.
function schemaProblems(schema, at = "root") {
  const out = [];
  if (!schema || typeof schema !== "object") return [`${at}: not a schema`];
  if (schema.enum !== undefined) {
    if (!Array.isArray(schema.enum) || schema.enum.length === 0) out.push(`${at}: an empty enum`);
    return out;
  }
  switch (schema.type) {
    case "object": {
      const props = schema.properties;
      if (!props || typeof props !== "object" || Object.keys(props).length === 0) return [`${at}: an object with no properties`];
      const keys = Object.keys(props);
      const req = schema.required ?? [];
      if (!Array.isArray(req) || req.length === 0) out.push(`${at}: no required field`);
      for (const r of req) if (!keys.includes(r)) out.push(`${at}: required "${r}" is not a property`);
      const lead = keys.slice(0, req.length);
      if (req.some((r) => !lead.includes(r))) out.push(`${at}: the required fields (${req.join(", ")}) are not the first properties (${lead.join(", ")})`);
      for (const k of keys) out.push(...schemaProblems(props[k], `${at}.${k}`));
      return out;
    }
    case "array":
      if (!Number.isInteger(schema.maxItems) || schema.maxItems < 1) out.push(`${at}: a list with no maxItems`);
      if (!schema.items) return [...out, `${at}: a list with no items schema`];
      return [...out, ...schemaProblems(schema.items, `${at}[]`)];
    case "string":
      if (!Number.isInteger(schema.maxLength) || schema.maxLength < 1) out.push(`${at}: a string with no maxLength`);
      return out;
    case "integer":
    case "number":
      if (!Number.isFinite(schema.maximum)) out.push(`${at}: a number with no maximum`);
      return out;
    case "boolean":
      return out;
    default:
      return [`${at}: type ${JSON.stringify(schema.type)} is not one this table caps`];
  }
}

// The largest legal value of a capped schema: every property present, every list full, every
// string at its cap (plain ASCII, one character each), every number at its maximum.
function maximalOf(schema) {
  if (schema.enum !== undefined) return schema.enum.reduce((a, b) => (JSON.stringify(b).length > JSON.stringify(a).length ? b : a));
  switch (schema.type) {
    case "object":
      return Object.fromEntries(Object.entries(schema.properties).map(([k, s]) => [k, maximalOf(s)]));
    case "array":
      return Array.from({ length: schema.maxItems }, () => maximalOf(schema.items));
    case "string":
      return "x".repeat(schema.maxLength);
    case "integer":
    case "number":
      return schema.maximum;
    case "boolean":
      return false;
    default:
      throw new Error(`caps: cannot size type ${JSON.stringify(schema.type)}`);
  }
}

// The characters of JSON a maximal legal call carries. Refuses an uncapped schema.
function maxPayload(schema) {
  const problems = schemaProblems(schema);
  if (problems.length) throw new Error(`caps: an uncapped schema cannot be sized: ${problems.join("; ")}`);
  return JSON.stringify(maximalOf(schema)).length;
}
// ---------------------------------------------------------------- end of lib/caps.mjs

// ---------------------------------------------------------------- inlined from lib/prompts.mjs (edit the module, then run: node lib/make-scripts.mjs write)
// THE PROMPT BUILDERS (U4 of docs/plans/hybrid-plan-step-plan.md). Every prompt the run sends a
// helper is built here, by tested code, so each seat's charter has one home and cannot drift
// between copies (KTD1). Each builder returns { prompt, schema }: the prompt text, and the key of
// the caps.mjs schema the helper's StructuredOutput call must match (null for a helper that answers
// in plain text). The size-law line a prompt states and the schema a script passes therefore come
// from one choice, made here. A whole-plan reader's also carries endsAt, the last line's number its
// prompt names, which promptShortRead checks a stop against.
//
// What the prompts carry (R3, R6, KTD7, KTD22):
//   - every prompt: never WebFetch; never ask the user; no file written, but a research helper's
//     one dossier; absolute paths and a path on every Grep and Glob; read-only commands only;
//   - every prompt after the contract brief exists: the project's CLAUDE.md paths to read first,
//     the contract brief verbatim, and the request with the brief (ctx.request, ctx.brief: an
//     update run may have no brief, and on an update the goal is judged against the brief, an
//     origin document the plan cites and any goal change the request asks for, never the plan's
//     own Goal Capsule, and a move toward one of them or toward a finding this run confirmed,
//     ctx.goalMoves, is asked);
//   - every whole-plan reader (each check seat, the premise seat, the scorer): the paging rule and
//     the reading inventory, the plan's last line given by its number only (its text is what
//     KTD7's check compares, so a prompt that quoted it would hand a short reader the answer);
//   - every prompt after the contract brief on an update run (research never runs on one, and
//     refuses it): the plan is committed and may be partly built, the request need not restate its
//     goal, and the named path (ctx.lands) holds the plan's own earlier version, never a stale doc
//     and never evidence;
//   - every prompt that names a CE file: KTD22's lens rule (the file supplies the lens only, never
//     tools, models, sub-agents or file writes);
//   - every persona seat: ultramode's precedence block, rewritten for plans (our schema wins, the
//     whole plan rather than CE's section slice, Opus rather than CE's model tier, ownership only
//     among the seats running, no origin-keyed suppression);
//   - every check seat, the check's premise seat included: the roster and ownership table of
//     exactly the seats running, the line that its class is never a false positive (over CE's
//     "pre-existing issues" catalog entry), and the settlement rule (CE's subagent-template.md).
// Model and effort are not prompt text: U5 sets model 'opus' and effort 'xhigh' on every agent()
// call (R3, KTD13).
//
// Pure and import-free: U5's generator inlines this file into the Workflow scripts beside caps.mjs,
// so it reads no file, no clock and no random number, its top-level names all start with "prompt"
// or "PROMPT_", and caps.mjs's size laws arrive as an input (ctx.laws, its SIZE_LAWS) rather than as
// an import. The seat names, the agent list, the section kinds, the risk signals and the critical
// kinds are written here and tested against resolve-ce.mjs, caps.mjs and select.mjs.
// Templates fill {slot} markers in one pass; a slot left unfilled, or filled with nothing, throws,
// naming the slot.

// ---------------------------------------------------------------- the seats

// The check's seats (KTD6). `ce` is the resolve-ce.mjs CE_FILES key of the seat's persona file, or
// null for our seats, which read none; `owns` is the claim class the roster table gives the seat;
// `role` is its lens, sent always (a persona file enriches it, and runs alone when the file is
// missing, R2); an adversary gets ADVERSARY MODE, a panel seat with its one `angle`.
const PROMPT_CHECK_SEATS = {
  coherence: {
    ce: "coherence",
    owns: "the seams between sections: contradictions, a term used two ways, a decision one section makes and another ignores, an ID no unit or test carries",
    role: "internal consistency of the whole plan. Read every section against every other, and report where two sections cannot both be true, where a requirement, decision or ID is dropped between sections, and where the units and the verification do not carry what the requirements and decisions promise.",
  },
  feasibility: {
    ce: "feasibility",
    owns: "whether each unit can be built as written in this repo: its prerequisites, its sequencing, and what the plan assumes about existing code, tools and platforms",
    role: "can this be built as written, in this codebase? Check every claim the plan makes about existing code, APIs, tools and platforms against the source, and report a missing prerequisite, a sequence that cannot work, a unit whose approach the code contradicts, and effort the plan badly understates.",
  },
  "scope-guardian": {
    ce: "scope-guardian",
    owns: "scope against the goal: mechanisms sized to the need, work nobody asked for, deferrals that drop required work",
    role: "does the scope match the goal? Report a mechanism sized beyond the problem it answers, work no requirement asks for, a deferral or cut that drops required work, and a unit that traces to no requirement.",
  },
  adversarial: {
    ce: "adversarial",
    adversary: true,
    owns: "the plan's load-bearing claims and choices, broken by concrete failure scenarios",
    role: "challenge the plan's load-bearing claims, choices and assumptions: construct the concrete scenario in which building from the plan as written gives a wrong or harmful result.",
  },
  product: {
    ce: "product",
    owns: "the product position: the problem, the goal, and what gets built first",
    role: "the product position. Is the problem real for the people it serves, does the goal predict an outcome they want, and does the order of the work serve that goal? Name what building this costs in what is not built.",
  },
  security: {
    ce: "security",
    owns: "trust boundaries, secrets and sensitive data, authentication, authorization and abuse paths",
    role: "security. Report a trust boundary the plan crosses unguarded, a secret or sensitive value it exposes, logs or commits, an authentication or permission gap, and an abuse path it opens.",
  },
  design: {
    ce: "design",
    owns: "user-facing flows, screen states, interaction and accessibility",
    role: "design. Report a user-facing state the plan leaves undefined (empty, loading, error, partial), a flow that dead-ends, an interaction gap, and an accessibility failure.",
  },
  "adv-sequencing": {
    ce: "adversarial",
    adversary: true,
    owns: "sequencing and dependencies between units and steps",
    angle: "sequencing and dependencies: a unit that needs work a later unit does, a step that runs before its input exists, an order that breaks when one step fails, dies or is retried",
    role: "break the plan's order of work.",
  },
  "adv-settled": {
    ce: "adversarial",
    adversary: true,
    owns: "decisions, settled or not, that cannot reach their outcome, and assumptions the plan never checks",
    angle: "a decision, settled or not, that cannot reach its outcome: a decision whose own constraints keep it from the outcome it states (preferring the alternative it rejected is not a finding); and any assumption the plan never checks: a load-bearing belief about the code, a tool or a platform with no source, and no check that would show it failing",
    role: "break the plan's decisions on their own terms, and its unchecked assumptions.",
  },
  "adv-hidden-work": {
    ce: "adversarial",
    adversary: true,
    owns: "work the plan needs but never names",
    angle: "hidden work: work the plan needs but never names (a migration, a doc, a fixture, a tool, a caller to update, a permission, a cleanup), so the build discovers it late",
    role: "find the work the plan will need but never names.",
  },
  "adv-verification": {
    ce: "adversarial",
    adversary: true,
    owns: "verification that cannot catch the failure it is there for",
    angle: "verification gaps: a requirement, unit or risk whose verification cannot catch the failure it is there for, or reads only its own success",
    role: "break the plan's verification.",
  },
  reach: {
    ce: null,
    owns: "every claim that something is only, never, every, unreachable, uncalled or unchanged",
    role: "the reach claims. Every claim the plan makes with \"only\", \"never\", \"every\", \"no caller\", \"unreachable\" or \"unchanged for\", or a word that means the same (all, none, sole, always, dead, nothing else), is a claim about the code. Check each one by enumerating the callers, writers and readers it is about, and the gate that enforces it, with absolute-path greps over the repo (each spelling and each import form). Report each claim the code contradicts, with the counterexample's file:line. A claim that only tests or fixtures reach a code path is checked against the production callers too.",
  },
  "blast-radius": {
    ce: null,
    owns: "live docs, registers and code comments that still state what the plan changes",
    role: "the blast radius. For every decision the plan changes or supersedes, find every sentence in the project's live docs, registers (a TODO, a backlog, a README, a plan in force) and code comments that still states the old truth. Grep each key word of the old truth separately (a name, a number, a path, a phrase), never only the one sentence the plan quotes, and read each hit for tense: a sentence that states the old behavior as current is a finding. Planning never edits other docs, so each fix is a line for the plan's docs unit naming the file:line to change and its new truth (KTD23).",
  },
  "test-vacuity": {
    ce: null,
    owns: "planned tests that would pass on wrong code",
    role: "test vacuity. For every test the plan names, ask: what wrong implementation does it fail on (name one); does it set a non-default value on both sides of what it compares, so a default cannot pass it; is there an input that breaks exactly one rule, so the test proves that rule alone; and does every absence check (nothing written, no call, no error) have a presence check beside it, proving the thing exists when it should? Report each planned test that would pass on wrong code, with the wrong code it misses.",
  },
};

// The premise seat is no check seat of the table above (promptPremise builds it, in the deepen and
// in the check alike), but a check roster names it, so the ownership table every roster reads holds
// it beside them.
const PROMPT_PREMISE_OWNS = "the plan's premise: whether the problem is real and the goal is the one asked for";
const PROMPT_OWNS = { ...Object.fromEntries(Object.entries(PROMPT_CHECK_SEATS).map(([k, s]) => [k, s.owns])), premise: PROMPT_PREMISE_OWNS };

// The single adversary's angles. The panel's four angles together carry every one (tested), so
// running the panel in its place drops none.
const PROMPT_ANGLE_LIST = ["sequencing and dependencies", "a decision, settled or not, that cannot reach its outcome", "hidden work", "verification gaps", "any assumption the plan never checks"];

// The research and deepen helpers' agent files (KTD4, KTD5 step 3), by their CE file stems: the
// same thirteen resolve-ce.mjs lists (tested).
const PROMPT_AGENTS = [
  "repo-research-analyst", "learnings-researcher", "spec-flow-analyzer", "agent-native-planning-strategist",
  "best-practices-researcher", "framework-docs-researcher", "web-researcher", "git-history-analyzer",
  "architecture-strategist", "pattern-recognition-specialist", "performance-oracle", "security-sentinel",
  "data-integrity-guardian",
];
// The external researchers (research.md's Stage 1-3 rules): they work outside sources first, on the
// focus the main loop recorded with its external-research call (note key external, KTD4).
const PROMPT_EXTERNAL = ["best-practices-researcher", "framework-docs-researcher", "web-researcher"];

// The verifiers' refuter angles, diverse rather than repeated (N identical refuters are about 1):
// a finding or amendment gets the first n, n from vote-law.mjs's refuterCount (KTD8).
const PROMPT_REFUTER_ANGLES = [
  "REPRODUCE-IN-SOURCE: read the plan lines it cites and the code, docs or measurement its evidence names. Does the gap really exist as stated?",
  "CONSEQUENCE: would building from the plan as written really go wrong, or does another section, a unit, a test scenario, a guard in the code or the plan's own verification already handle it?",
  "FIX-CORRECTNESS + PROJECT VALUES: is the proposed change right, or does it break another section, a settled decision or a deliberate value the contract brief lists? Preferring the alternative to a settled decision is not material.",
];

// The scorer's section kinds (caps.mjs SECTION_KINDS, tested) and the checklist each one scores
// against: CE's from deepening-workflow.md 5.3.3, then our four (KTD5), then a catch-all.
const PROMPT_KINDS = {
  "requirements": "CE's Requirements checklist",
  "context-research": "CE's Context & Research / Sources & References checklist",
  "key-decisions": "CE's Key Technical Decisions checklist",
  "open-questions": "CE's Open Questions checklist",
  "design": "CE's High-Level Technical Design checklist (present or absent)",
  "units": "CE's Implementation Units checklist",
  "system-impact": "CE's System-Wide Impact checklist",
  "risks": "CE's Risks & Dependencies checklist",
  "docs-ops": "CE's Documentation / Operational Notes checklist",
  "goal-problem": "our Goal Capsule and Problem Frame checklist",
  "assumptions": "our Assumptions checklist",
  "verification": "our Verification Contract checklist",
  "done": "our Definition of Done checklist",
  "other": "none of these: score it against the closest checklist and name that checklist in its note",
};
// CE's critical sections (deepening-workflow.md 5.3.3), as kinds: select.mjs's CRITICAL_KINDS
// (tested). The scorer is told them only to know which sections need a note.
const PROMPT_CRITICAL = ["key-decisions", "units", "system-impact", "risks", "open-questions"];
// CE's seven high-risk signals (final-review.md 5.3.1), by caps.mjs's RISK_SIGNALS keys (tested).
const PROMPT_RISKS = {
  "security": "authentication, authorization or security-sensitive behavior",
  "payments": "payments, billing or financial flows",
  "data-migration": "data migrations, backfills or persistent data changes",
  "external-api": "external APIs or third-party integrations",
  "privacy": "privacy, compliance or user data handling",
  "parity": "cross-interface parity or multi-surface behavior",
  "rollout": "significant rollout, monitoring or operational concerns",
};

// A whole-plan reader pages through the file (KTD7): one Read of a large plan returns a fraction
// of it (the 153 KB pay-check spec came back as lines 1 to 269 of 1,059). Exported for U5's check
// that pages_read is at least ceil(N / PROMPT_PAGE).
const PROMPT_PAGE = 160;
// The inventory quotes the first 120 characters of the last line (caps.mjs lastLineText, tested).
const PROMPT_QUOTE = 120;
// KTD7's quote check passes a reader's quote that is a prefix of the true last line, both ends
// trimmed, at least min(length, PROMPT_QUOTE_FLOOR) characters long (a model miscounts exactly 120).
// Exported for U5's check; a later round masks a change line that opens with that many of the last
// line's characters, since a reader could quote it and pass (R4-32).
const PROMPT_QUOTE_FLOOR = 40;

// ---------------------------------------------------------------- filling and checking

// Fills every {slot} in one pass, through a replacement function (a replacement string would read
// "$&", "$'" and "$$" in a slot's value as patterns). A slot with no value, or an empty one, throws
// naming it; a value is never scanned again, so braces inside it stay as they are.
function promptFill(template, slots) {
  return template.replace(/\{([a-z][a-z0-9_]*)\}/g, (m, name) => {
    if (!slots || !Object.hasOwn(slots, name) || slots[name] === undefined || slots[name] === null) throw new Error(`prompts: the slot {${name}} is unfilled`);
    const v = slots[name];
    if (typeof v !== "string" || !v.trim()) throw new Error(`prompts: the slot {${name}} is empty`);
    return v;
  });
}

function promptText(v, what) {
  if (typeof v !== "string" || !v.trim()) throw new Error(`prompts: ${what} is required, as non-empty text`);
  return v.trim();
}
// An absolute path, in Windows (C:/ or C:\) or POSIX form.
function promptPath(v, what) {
  promptText(v, what);
  if (!/^(?:[A-Za-z]:[\\/]|\/)/.test(v)) throw new Error(`prompts: ${what} is an absolute path; got ${JSON.stringify(v)}`);
  return v;
}
function promptPathOrNull(v, what) {
  return v === null ? null : promptPath(v, what);
}
function promptLaw(ctx, key) {
  const law = ctx?.laws?.[key];
  if (typeof law !== "string" || !law.trim()) throw new Error(`prompts: ctx.laws.${key} is required (caps.mjs SIZE_LAWS)`);
  return law;
}
function promptClaudeMd(list) {
  if (!Array.isArray(list)) throw new Error("prompts: ctx.claudeMd is the list of the project's CLAUDE.md paths (an empty list when it has none)");
  list.forEach((p, i) => promptPath(p, `ctx.claudeMd[${i}]`));
  return list.length ? list.join(", ") : "none (the project has no CLAUDE.md of its own)";
}
function promptLastLine(ctx) {
  const last = ctx?.lastLine;
  if (!last || !Number.isInteger(last.line) || last.line < 1 || typeof last.text !== "string" || !last.text.trim()) throw new Error("prompts: ctx.lastLine is the plan's last line with text, { line, text } (flow.mjs index's last)");
  return last;
}
function promptIndex(index) {
  if (!Array.isArray(index) || index.length === 0) throw new Error("prompts: the plan's section index (flow.mjs index's index) is required");
  for (const h of index) {
    if (!h || !Number.isInteger(h.line) || h.line < 1 || !Number.isInteger(h.level) || h.level < 1 || h.level > 6 || typeof h.heading !== "string" || typeof h.own !== "boolean") throw new Error(`prompts: a malformed section index entry ${JSON.stringify(h)}: each has line, level, heading and own`);
  }
  return [...index].sort((a, b) => a.line - b.line);
}

// ---------------------------------------------------------------- the shared blocks

const PROMPT_TOOLS = "TOOLS AND FILES: never use WebFetch (it has no timeout and can hang you for good); for the web, use the gemini-grounding search tools (load them with ToolSearch) or curl -sL --max-time 15. For a library's documentation, use Context7 first (load its tools with ToolSearch \"context7\"), at the version the repo pins, and gemini-grounding or curl when Context7 lacks the library. Never ask the user anything: this run is unattended, so a question you would ask becomes a finding, an assumption or a residual risk in your return. {writes} Use absolute paths, and give every Grep and Glob an absolute path. Run only read-only commands (git log, git show, git grep, a node one-liner that reads); never install, build, start a server, run a test suite, start claude or spawn a helper.";
const PROMPT_READ_ONLY = "Create, edit or delete no file anywhere: no notes, no probes, no scratch files.";

const PROMPT_LENS_RULE = "THE LENS RULE: a CE file supplies your lens only: what to look for and how to calibrate. Its instructions about tools, models, command-line tools, sub-agents, scratch folders or file writes do not apply here; this prompt's tool rules are the complete list.";

const PROMPT_LAWS = [
  "THE PROJECT'S LAWS: read these CLAUDE.md files before anything else: {claude_md}",
  "THE CONTRACT BRIEF (the project's invariants, the deliberate values not to flag, and its landmines; judge against these):",
  "{contract_brief}",
].join("\n");

// The last line goes by its number alone: KTD7's check compares the reader's quote of it with the
// line, so a prompt that quoted it would let a reader that never reached the end echo it and pass.
const PROMPT_PAGING = [
  "READ THE WHOLE PLAN: {plan}",
  "It ends at line {last_line}. One Read returns only part of a large file, so read the plan in pages of at most {page} lines (Read with offset and limit), in order, until you have read line {last_line}. Return the reading inventory with your answer: last_line_number and last_line_text, the number and the first {quote} characters of the last line holding text that you read, as Read returned it, without Read's line-number prefix; and pages_read, how many Read calls the plan took. A reader whose last line falls short of line {last_line} is re-run.",
].join("\n");

const PROMPT_SETTLED = "SETTLED DECISIONS: a decision marked settled (a \"session-settled:\" annotation, or one carrying Briggsy's own words or ratification) stays in view and is protected: never propose removing or rewording its annotation. A finding against it stands at full severity when it shows the decision cannot reach its outcome under its own constraints; preferring the alternative it rejected is not a finding. Report it like any other finding: the run, not you, decides whether it parks.";

// The finders' severity ladder, which a finding's verifier grades on too: its corrected_severity is
// what the deepen's premise gate reads (vote-law.mjs severityLine, KTD5's As-built note), so a vote
// and a claim must mean one severity (R4-34).
const PROMPT_LADDER = "P0, building from the plan as written gives the wrong thing on every path, or the plan cannot reach its goal; P1, a wrong decision, a missing or wrong unit, or a verification that passes on wrong code, on a path the build takes; P2, a real gap on a narrow path, or a section too weak for its job; P3, minor.";
const PROMPT_FINDER_RETURN = `RETURN ONLY the structured object. Each finding names the plan section it is about (its heading) and the plan line it rests on, and carries its evidence in why_it_matters: the plan's words, and the file:line in the repo or the doc that contradicts or confirms them. suggested_fix is the change to the plan that closes it. Suppress a finding you cannot honestly anchor at confidence 50; a 50 survives only as P0 or as a residual risk, and an actionable finding needs 75. Severity: ${PROMPT_LADDER} An empty findings list is an honest answer when your class holds nothing.`;

const PROMPT_PERSONA = [
  "YOUR PERSONA FILE: {persona}",
  "Read it first: it defines your lens (what to look for, how to hunt, how to calibrate). Where it conflicts with this prompt:",
  "1. OUTPUT: this prompt's structured object wins over the persona's output format and findings schema. Emit exactly this schema's fields; there are no artifact files, and the persona's evidence, autofix_class, owner, pre_existing and requires_verification fields do not exist here: put your best evidence in why_it_matters. Every finding carries why_it_matters and suggested_fix; where the persona lets a finding omit a fix, propose the most defensible one and name its assumption.",
  "2. SCOPE: you read the whole plan, never a section slice, whatever CE's dispatch.md says about slices; judge how the sections fit each other as well as the sections your lens names.",
  "3. MODEL: you run on Opus at xhigh effort, set by this run; CE's dispatch.md model tiers do not apply.",
  "4. CONFIDENCE: the persona's anchor rubric (0, 25, 50, 75, 100) is this schema's confidence enum.",
  "5. OWNERSHIP: the persona's \"another reviewer owns this\" boundaries apply only to the seats in the roster above; a concern whose owner is not running is yours to report.",
  "6. INPUTS: where the persona expects an Origin line, there is none: a brief from /brief is research, not a validated product contract, so no origin-keyed suppression applies. Where it expects Settled decisions, read the plan's own annotations under the settlement rule below.",
].join("\n");

const PROMPT_ADVERSARY = "ADVERSARY MODE: your job is to break this plan, not tick a checklist. Construct concrete scenarios in which building from the plan as written gives a wrong or harmful result: the exact state, input or sequence, and the outcome it produces. {angle_line} A scenario you cannot make concrete is not a finding, and the contract brief's deliberate values are not targets.";
const PROMPT_ADVERSARY_ANGLES = `Pick the angles that fit: ${PROMPT_ANGLE_LIST.slice(0, -1).join(", ")}, and ${PROMPT_ANGLE_LIST[PROMPT_ANGLE_LIST.length - 1]}.`;

// A later check round (KTD9): each change the fold made, by flow.mjs's change kinds, with the text it
// added or removed (a deletion leaves no sentence in the plan, so its old text is shown), and an edit
// with the text it replaced as well as its new text (R4-25: a clause the edit dropped is in neither
// the plan nor its new text, and fold.mjs's ID check passes while the ID stays).
// Round 2 admits a P0 or P1 found anywhere; round 3 checks one fix alone.
const PROMPT_CHANGE_LABELS = { edit: "edited", add: "added", delete: "removed" };
const PROMPT_ROUND = [
  "THIS IS CHECK ROUND {round}. The plan changed since the last round; these are the changes the fold made, each with the text it added or removed, and an edit with the text it replaced (was) and its text now:",
  "{changes}",
  "Read the whole plan again. Judge first whether each change is right (an edit's dropped words included) and whether it opened a seam with any other section; a finding the last round reported and the fold closed is not new. Report a P0 or P1 wherever you find it in the plan; report a P2 or P3 only where a change causes it or touches it, and put any other in residual_risks.",
].join("\n");
const PROMPT_ROUND_3 = "This round checks one fix alone, the fold of a P0 or P1 that round 2 confirmed: judge that fix and the seams it opened first, and never hold back a P0 or P1 you see anywhere else.";

// search_with_grounding takes a query and returns Gemini's cited summary; it reads no page the helper
// chooses, so curl is named as the fetch tool CE's web-researcher.md asks for (R4-21).
const PROMPT_WEB_TOOL = "Search with gemini-grounding's search_with_grounding (load it with ToolSearch): it returns Gemini's cited summary, not the pages. Read a chosen page with curl -sL --max-time 15, which this prompt names as the web-fetch tool your agent file asks for, over its rule that a generic command is not one. Cite a URL as read only when you fetched it, and mark a claim that rests on a grounded summary alone.";

function promptToolsBlock(writes) {
  return promptFill(PROMPT_TOOLS, { writes });
}
function promptLawsBlock(ctx) {
  return promptFill(PROMPT_LAWS, { claude_md: promptClaudeMd(ctx?.claudeMd), contract_brief: promptText(ctx?.contractBrief, "ctx.contractBrief (the contract brief, KTD22)") });
}
function promptPagingBlock(ctx) {
  const last = promptLastLine(ctx);
  return promptFill(PROMPT_PAGING, {
    plan: promptPath(ctx.plan, "ctx.plan (the plan the helper reads)"),
    last_line: String(last.line),
    page: String(PROMPT_PAGE),
    quote: String(PROMPT_QUOTE),
  });
}
const promptJoin = (parts) => parts.filter((p) => p !== null && p !== undefined && p !== "").join("\n\n");

// The request and the brief, in every prompt after the contract brief: a goal claim (the premise
// seat's, a verifier's, the scorer's goal checklist) is judged against them. A new plan always has a
// brief, and its goal is the one the request and the brief ask for. An update run starts at the
// deepen (flow.mjs firstStage), so it may have no brief (ctx.brief null), and its request is the
// update's ask, a change or only a re-check, which need not restate the plan's goal (R4-20): a seat
// that took it as the goal's yardstick would flag the standing goal as unasked. So on an update the
// goal is judged against the brief, an origin document the plan cites and any goal change the
// request asks for; HEAD's version at ctx.lands is only the line a moved goal is measured from; and a
// goal no source states is unjudged, never a finding and never a pass. Never against the plan's own
// Goal Capsule, which under an update is the committed plan judging itself.
// A move from HEAD's goal is unasked only beyond what every source asks, the findings this run
// confirmed among them (R4-29): a send-back's rewrite toward the brief, a cited origin or a confirmed
// incident or population finding would otherwise read as a moved goal to the second deepen's premise
// seat and its verifiers, and a second premise finding blocks the run (flow.mjs nextStep).
// ctx.goalMoves is that list, required on an update (an empty list when none) and recorded by U6:
// each finding worded without its stakes, since a seat told what its finding sets off may hide a
// true premise.
const PROMPT_UPDATE_GOAL = "THE GOAL, ON AN UPDATE: judge the plan's goal against {sources}. The plan's own Goal Capsule is never what was asked (under an update the plan is the committed one, so that would be circular): HEAD's version of it at {lands} is only the line a moved goal is measured from. A goal moved from it is a finding only where it moves beyond what {licences} ask; a move one of them asks for is asked, never a finding. Judge too whether the plan makes the change the request asks. When {none} states a goal, the goal is not judged: never a finding and never a pass.\nFINDINGS THIS RUN CONFIRMED, which the plan now answers:{moves}";
function promptGoalMoves(ctx) {
  const moves = ctx.goalMoves;
  if (!ctx.update) {
    if (moves !== undefined && !(Array.isArray(moves) && moves.length === 0)) throw new Error("prompts: ctx.goalMoves is for an update run only: a new plan's goal is judged against the request and the brief, and a rewrite that says how it moved the goal answers them");
    return null;
  }
  if (!Array.isArray(moves) || moves.some((m) => typeof m !== "string" || !m.trim())) throw new Error("prompts: ctx.goalMoves is the list of the findings this run confirmed that the plan now answers, each as non-empty text worded without its stakes (an empty list when none); an update needs it, since a goal moved toward one is asked");
  return moves.length ? `\n${moves.map((m) => `- ${m.trim().split(/\r?\n/).join("\n  ")}`).join("\n")}` : " none.";
}
function promptRequestBlock(ctx) {
  const request = promptText(ctx?.request, "ctx.request (what was asked for)");
  if (typeof ctx.update !== "boolean") throw new Error("prompts: ctx.update says whether this run updates a committed plan (true or false)");
  if (ctx.brief === null && !ctx.update) throw new Error("prompts: ctx.brief is the brief's path; only an update run may have none (null)");
  const brief = ctx.brief === null ? null : promptPath(ctx.brief, "ctx.brief (the brief's path, or null on an update run given none)");
  const moves = promptGoalMoves(ctx);
  if (!ctx.update) return promptFill("THE REQUEST (what was asked for):\n{request}\nTHE BRIEF it was planned from: {brief} (read it).", { request, brief });
  const lands = promptPath(ctx.lands, "ctx.lands (the plan's named path, which an update run's landing replaces)");
  const asked = brief === null
    ? promptFill("THE REQUEST (what was asked for):\n{request}\nTHE BRIEF: none. This run updates a plan already committed and was given no brief.", { request })
    : promptFill("THE REQUEST (what was asked for):\n{request}\nTHE BRIEF for this update: {brief} (read it).", { request, brief });
  return `${asked}\n${promptFill(PROMPT_UPDATE_GOAL, {
    lands,
    sources: brief === null ? "any origin document the plan cites and any goal change the request asks for" : "the brief, any origin document the plan cites and any goal change the request asks for",
    licences: brief === null ? "the request, an origin document the plan cites and the findings this run confirmed (below)" : "the request, the brief, an origin document the plan cites and the findings this run confirmed (below)",
    none: brief === null ? "neither the request nor an origin document the plan cites" : "none of the request, the brief and any origin document the plan cites",
    moves,
  })}`;
}

// On an update run the named path holds HEAD's earlier version of the plan under review, which the
// landing replaces: a seat that reads the repo must not take it for a stale doc, nor its words for
// evidence (they are the plan's own). The plan is committed and may be partly built, so its As-built
// code is no collision, and the request is the update's ask, which need not restate the goal (R4-20).
// Every builder after the contract brief prints it; nothing on a new plan.
const PROMPT_UPDATE = "THIS RUN UPDATES A COMMITTED PLAN: {lands} holds HEAD's earlier version of this plan, which the landing replaces. It is never a stale doc, a counterexample or a target for the plan's docs unit, and its text is the plan's own words, never evidence for a claim about the code: cite the plan under review by its own lines. The plan is committed and may be partly built: its As-built notes and the code they name are the build so far, never a collision with the plan. The request is this update's ask (a change to the plan, or only a re-check) and need not restate the plan's goal, so a goal the request leaves out is not unasked.";
function promptUpdateBlock(ctx) {
  if (ctx?.update !== true) return null;
  return promptFill(PROMPT_UPDATE, { lands: promptPath(ctx.lands, "ctx.lands (the plan's named path, which an update run's landing replaces)") });
}
// What a seat is told of the plan's state, in its opening line: unbuilt on a new plan, committed and
// perhaps partly built on an update (R4-20). Read after promptRequestBlock has checked ctx.update.
const promptPlanState = (ctx, verb) =>
  ctx.update
    ? `The plan is committed and may be partly built (the update note below); you ${verb}, against the repo it changes`
    : `The plan has not been built; you ${verb}, against the repo it will change`;

// The roster a seat is told about: exactly the seats running in this run or round, known, none
// twice, the seat itself among them, and the single adversary or the panel, never both. The premise
// seat may sit in a check roster beside the check seats.
function promptRoster(roster, seat) {
  if (!Array.isArray(roster) || roster.length === 0) throw new Error("prompts: roster is the list of the seats running in this run");
  for (const s of roster) if (!Object.hasOwn(PROMPT_OWNS, s)) throw new Error(`prompts: the roster names ${JSON.stringify(s)}, which is no check seat (one of: ${Object.keys(PROMPT_OWNS).join(", ")})`);
  if (new Set(roster).size !== roster.length) throw new Error("prompts: the roster names a seat twice");
  if (!roster.includes(seat)) throw new Error(`prompts: the roster does not name ${seat}, the seat being built`);
  if (roster.includes("adversarial") && roster.some((s) => s.startsWith("adv-"))) throw new Error("prompts: a roster runs the single adversary or the high-risk panel, never both (KTD6)");
  return roster;
}
function promptRosterBlock(running) {
  return promptFill("THE ROSTER AND OWNERSHIP TABLE: the seats running in this check round, each with the class it owns; these are the only owners you may defer to.\n{table}", { table: running.map((k) => `- ${k}: ${PROMPT_OWNS[k]}`).join("\n") });
}

// A check round's number and, after round 1, the changes the fold made (KTD9), each
// { kind: "edit" | "add" | "delete", text }, an edit with `was` too, the text it replaced (R4-25;
// U5 takes it from a diff of the section before and after the fold, never from fold.mjs's
// old_values, which hold only the phrases the main loop recorded): null for round 1, else the
// round block.
// `last` is the plan's last line (ctx.lastLine). A fold that adds or edits the plan's last bullet
// would print the text KTD7's quote check compares, so in an add's text and an edit's text now,
// each line that opens with the last line's first min(length, PROMPT_QUOTE_FLOOR) trimmed
// characters is shown by its number instead (R4-32). A was and a deletion are old text, gone from
// the plan, and stay whole: masking them would hide the words the fold dropped (R4-25).
function promptRoundBlock(round, changes, last) {
  if (![1, 2, 3].includes(round)) throw new Error(`prompts: round is 1, 2 or 3; got ${JSON.stringify(round)}`);
  if (round === 1) {
    if (Array.isArray(changes) && changes.length) throw new Error("prompts: check round 1 has no changes to name");
    return null;
  }
  if (!Array.isArray(changes) || changes.length === 0) throw new Error(`prompts: check round ${round} needs the changes the fold made (changes)`);
  for (const c of changes) {
    if (!c || typeof c !== "object" || !Object.hasOwn(PROMPT_CHANGE_LABELS, c.kind) || typeof c.text !== "string" || !c.text.trim()) throw new Error(`prompts: a change is { kind: "edit" | "add" | "delete", text } (flow.mjs's change kinds), an edit with was too; got ${JSON.stringify(c)}`);
    if (c.kind !== "edit") {
      if (c.was !== undefined) throw new Error(`prompts: was is for an edit only, not ${c.kind} (an add has no old text, and a deletion's text is its old text); got ${JSON.stringify(c)}`);
      continue;
    }
    if (typeof c.was !== "string" || !c.was.trim()) throw new Error(`prompts: an edit carries was, the text it replaced (from a diff of the section before and after the fold); got ${JSON.stringify(c)}`);
    if (c.was.trim() === c.text.trim()) throw new Error(`prompts: an edit whose was is its text changed nothing; got ${JSON.stringify(c)}`);
  }
  // A change's own line breaks are indented, so a multi-line change never reads as a second bullet;
  // an edit's was and now each sit on a labeled line, their own line breaks indented deeper, since an
  // inline arrow would break on multi-line text and on the plan's own arrows.
  const indent = (text, by) => text.trim().split(/\r?\n/).join(`\n${by}`);
  const lastText = last.text.trim();
  const opening = lastText.slice(0, Math.min(lastText.length, PROMPT_QUOTE_FLOOR));
  const masked = (text) => text.trim().split(/\r?\n/).map((l) => (l.trim().startsWith(opening) ? `(line ${last.line}, the plan's last line: read it in the plan)` : l)).join("\n");
  const lines = changes.map((c) => (c.kind === "edit" ? `- edited, was: ${indent(c.was, "    ")}\n  now: ${indent(masked(c.text), "    ")}` : `- ${PROMPT_CHANGE_LABELS[c.kind]}: ${indent(c.kind === "add" ? masked(c.text) : c.text, "  ")}`)).join("\n");
  const block = promptFill(PROMPT_ROUND, { round: String(round), changes: lines });
  return round === 3 ? `${block}\n${PROMPT_ROUND_3}` : block;
}

// Where the learnings researcher searches: this repo's lesson folders, never CE's fixed
// docs/solutions path, which this repo does not have. Required for that agent, refused for others.
function promptLearningsBlock(agent, learnings) {
  if (agent === "learnings-researcher") {
    if (!learnings) throw new Error("prompts: the learnings researcher needs learnings { insights, memory }: this repo keeps its lessons there, not in a fixed docs/solutions path");
    return promptFill("WHERE LEARNINGS LIVE: this repo keeps its lessons in {insights} and in the memory folder {memory}. Search both; never a fixed docs/solutions path, which this repo does not have.", { insights: promptPath(learnings.insights, "learnings.insights"), memory: promptPath(learnings.memory, "learnings.memory") });
  }
  if (learnings !== null && learnings !== undefined) throw new Error(`prompts: learnings is for the learnings researcher only, not ${agent}`);
  return null;
}

// An external researcher's focus: the main loop's recorded reason for outside research (note key
// external). Required for the three, refused for the rest.
function promptFocus(agent, focus) {
  if (PROMPT_EXTERNAL.includes(agent)) return promptText(focus, `focus (the main loop's recorded reason for outside research, note key external), which ${agent} needs`);
  if (focus !== null && focus !== undefined) throw new Error(`prompts: focus is for the external researchers only (${PROMPT_EXTERNAL.join(", ")}), not ${agent}`);
  return null;
}
// The opening of an external researcher's job: outside sources first, the repo only for versions
// and fit, and the web tool named (CE's web-researcher.md stops when it finds none). A deepen helper
// may have no focus (an update run records no external note, R4-18): its section's problems are it.
const promptOutsideFirst = (focus) =>
  (focus === null ? "outside sources first, on the section's problems above. " : promptFill("outside sources first, on this focus: {focus}. ", { focus: focus.replace(/[.\s]+$/, "") })) +
  "Use the repo only to read the versions in use or to check how an outside answer fits it. " + PROMPT_WEB_TOOL;

// A research or deepen helper's agent file, with CE's optional scope prefix (deepening-workflow.md's
// "Scope: architecture, patterns"), or, when the file is missing, its own method.
function promptAgentBlock(agent, file, scope, wins) {
  const scoped = scope === null ? null : promptText(scope, "scope");
  if (file) return promptFill("YOUR AGENT FILE: {file}", { file }) + (scoped ? ` (Scope: ${scoped})` : "") + promptFill("\nRead it first: it is your research method. Where it conflicts with this prompt, this prompt wins: {wins}.", { wins });
  return promptFill("CE's agent file for {agent} is missing in this run, so research by your own method", { agent }) + (scoped ? `, scoped to ${scoped}` : "") + " (the receipt names this seat as run without its file).";
}

// ---------------------------------------------------------------- the contract brief (KTD22)

// The one Agent-tool helper the main loop runs before the run's first Workflow. It answers in plain
// text, 10 to 20 lines, which the run records verbatim and passes to every later helper. `update`
// says whether the run updates a committed plan, which the brief then calls committed, not yet to be
// written (R4-20).
function promptContractBrief({ planPath, project, claudeMd, insights, request, update } = {}) {
  if (typeof update !== "boolean") throw new Error("prompts: update says whether this run updates a committed plan (true or false)");
  const prompt = promptJoin([
    promptFill(update ? "You write the contract brief for an unattended planning run. The plan is committed at {plan_path}, in the project at {project}, and this run updates it.\nTHE REQUEST:\n{request}" : "You write the contract brief for an unattended planning run. The plan will be written at {plan_path}, in the project at {project}.\nTHE REQUEST:\n{request}", {
      plan_path: promptPath(planPath, "planPath (the plan's named path)"),
      project: promptPath(project, "project (the project's root)"),
      request: promptText(request, "request (what was asked for)"),
    }),
    promptFill("READ, in this order: the project's CLAUDE.md files ({claude_md}); then its lessons in {insights}: list the folder, read each file's frontmatter (its title and tags), and read in full only the ones that bear on the request.", {
      claude_md: promptClaudeMd(claudeMd),
      insights: promptPath(insights, "insights (the project's docs/insights/ folder)"),
    }),
    "RETURN ONLY 10 to 20 lines of plain text, with no preamble, in three groups, each line naming its source file:\nINVARIANTS: rules every change in this project must keep.\nDELIBERATE VALUES: choices that look wrong but are intended, which reviewers must not flag.\nLANDMINES: traps past work hit, which a plan for this request could hit again.\nEvery helper in the run gets these lines verbatim, so state each one as a rule, in plain words, in at most about 200 characters.",
    promptToolsBlock(PROMPT_READ_ONLY),
  ]);
  return { prompt, schema: null };
}

// ---------------------------------------------------------------- research (KTD4)

// One research helper, seeded from its CE agent file (null when the file is missing: it runs on its
// own method, and the receipt names it). It writes one dossier and returns a gist. The request and
// the brief come from ctx; `learnings` is the learnings researcher's, `focus` an external one's.
// Research never runs on an update run (flow.mjs firstStage starts one at the deepen), so it refuses
// one rather than tell a helper for a plan not yet written that the plan is committed.
function promptResearch(ctx, { agent, agentFile, scope = null, dossier, learnings = null, focus = null } = {}) {
  if (!PROMPT_AGENTS.includes(agent)) throw new Error(`prompts: ${JSON.stringify(agent)} is not a research agent (one of: ${PROMPT_AGENTS.join(", ")})`);
  if (ctx?.update === true) throw new Error("prompts: research never runs on an update run (flow.mjs firstStage starts an update at the deepen)");
  const file = promptPathOrNull(agentFile, "agentFile");
  const where = promptLearningsBlock(agent, learnings);
  const outside = promptFocus(agent, focus);
  const out = promptPath(dossier, "dossier (the one file the helper writes)");
  const job = outside
    ? `YOUR JOB: research what the plan's author needs to know before writing it, by your method, in ${promptOutsideFirst(outside)}`
    : "YOUR JOB: research what the plan's author needs to know before writing it, by your method, grounded in this repo first and in outside sources only where the repo cannot answer.";
  const prompt = promptJoin([
    promptFill("You are the {agent} research helper for a plan that is not written yet. The repo it will change: {project}.", { agent, project: promptPath(ctx?.project, "ctx.project (the project's root)") }),
    promptAgentBlock(agent, file, scope, "your findings go into the one dossier file named below, and your return is this prompt's gist object, not the agent file's format"),
    file ? PROMPT_LENS_RULE : null,
    promptRequestBlock(ctx),
    where,
    job + promptFill(" Write everything you found into ONE dossier file at {dossier}: each claim with its source (a file:line, a measurement, or a URL with the date you read it) and what it means for the plan. Then return only the gist object: gist, the findings that matter most for the plan; dossier, that file's absolute path; changes_a_decision, true when a finding should change a decision the request or the brief implies (the run reads the dossier only then).", { dossier: out }) + (outside ? " When outside research could not run (no web tool answered), the gist opens with \"outside research could not run:\" and the reason." : ""),
    promptLawsBlock(ctx),
    promptToolsBlock(promptFill("Write exactly one file, your dossier at {dossier}; create, edit or delete no other file.", { dossier: out })),
    promptLaw(ctx, "gist"),
  ]);
  return { prompt, schema: "gist" };
}

// ---------------------------------------------------------------- the deepen (KTD5)

// The premise seat (KTD6's charter): in the deepen beside the scorer (mode "deepen", no roster), and
// in the check as one of its seats (mode "check", with the roster and the round, as every check seat
// has). Its four parts are the incident, the population, the asked-for goal, and CE's origin-keyed
// suppression never applying. The request and the brief come from ctx.
// A confirmed premise finding ends the deepen (KTD5), so the deepen's seat reports only a premise
// wrong enough to rewrite the plan, a P0 or P1, and puts lesser gaps in residual_risks, which the
// check's premise seat judges in full (R4-26). It is never told what its finding sets off: a seat
// that knows the stakes may hide a true premise. The prompt is only a request, so U5 gates on the
// voted severity too (KTD5's As-built note).
const PROMPT_DEEPEN_PREMISE = "IN THE DEEPEN: report only a premise wrong enough that the plan must be rewritten, a P0 or P1. Put a lesser premise gap (a P2 or P3) in residual_risks instead: the check's premise seat judges those.";
// Part 3 on an update: the request is the update's ask, so the goal is judged by THE GOAL, ON AN
// UPDATE (promptRequestBlock), never asked whether it is "the one asked for in the request" (R4-20);
// a move toward a source or a finding this run confirmed is asked (R4-29). An unjudged goal is
// answered in caps.mjs's goal_judged, never in residual_risks, which nothing reads: U5 reads it
// fail-closed on an update, and U6 turns false into a premise holes entry beside the class's own
// form, so the receipt never reads "nothing found" over a goal nobody judged (R4-30).
const PROMPT_GOAL_UPDATE = "3. THE GOAL: judge it by THE GOAL, ON AN UPDATE above: a goal moved from HEAD's version beyond what its sources and this run's confirmed findings ask, or a plan that does not make the change the request asks, is a finding; a move one of them asks for, and a goal the request leaves out, are not. When no source states a goal, set goal_judged false (the goal is not judged: never a finding and never a pass); when you judged it, set goal_judged true.";
// In the check, `round` is required, never defaulted, so a later round's call that leaves it out
// cannot build a round-1 seat that drops its changes (R4-33).
function promptPremise(ctx, { mode, roster, round, changes = [] } = {}) {
  if (mode !== "deepen" && mode !== "check") throw new Error(`prompts: mode is "deepen" or "check" (the premise seat runs in both); got ${JSON.stringify(mode)}`);
  const check = mode === "check";
  if (!check && (roster !== undefined || round !== undefined || (Array.isArray(changes) && changes.length))) throw new Error("prompts: the deepen's premise seat runs beside the scorer, with no roster and no round");
  const running = check ? promptRoster(roster, "premise") : null;
  const roundBlock = check ? promptRoundBlock(round, changes, promptLastLine(ctx)) : null;
  const asked = promptRequestBlock(ctx);
  const prompt = promptJoin([
    promptFill("You are the premise seat in the {mode} of a plan: {plan}. {state} ({project}) and the request {answers}.", {
      mode,
      plan: promptPath(ctx?.plan, "ctx.plan"),
      state: promptPlanState(ctx, "judge whether its premise holds"),
      project: promptPath(ctx?.project, "ctx.project"),
      answers: ctx.update ? "this update answers" : "it answers",
    }),
    asked,
    promptUpdateBlock(ctx),
    [
      "YOUR CHARTER, all four parts:",
      "1. THE INCIDENT: for every guard, gate, check or safety mechanism the plan adds, the incident it answers: a commit, a transcript or a measured case, cited. A guard against something that has never happened to this project is a finding, unless the plan shows why it will.",
      "2. THE POPULATION: for every feature, an instance of the population it serves that exists in today's code (a caller, a file, a flow, a user's case), cited by file:line. A feature with no such instance is a finding.",
      // A new plan always has a brief (promptRequestBlock refuses one without).
      ctx.update ? PROMPT_GOAL_UPDATE : "3. THE GOAL: is the plan's goal the one asked for in the request and the brief? A goal narrowed, widened or replaced without saying so is a finding.",
      "4. NO SUPPRESSION: CE's rule that switches the premise challenge off when a plan has an origin (a brief, a requirements document, a product contract) never applies here. You challenge the premise whatever the plan's origin.",
      `Your class is ${PROMPT_PREMISE_OWNS}. A finding in it is never a false positive: CE's false-positive catalog entry for "pre-existing issues the document's work does not reach" does not apply to it.`,
    ].join("\n"),
    check ? promptRosterBlock(running) : null,
    promptPagingBlock(ctx),
    promptLawsBlock(ctx),
    PROMPT_SETTLED,
    promptToolsBlock(PROMPT_READ_ONLY),
    roundBlock,
    PROMPT_FINDER_RETURN,
    check ? null : PROMPT_DEEPEN_PREMISE,
    promptLaw(ctx, "finder"),
  ]);
  return { prompt, schema: "finder", endsAt: promptLastLine(ctx).line };
}

// CE's method, inline, for a scorer whose CE files are missing (read in CE 3.37.0's
// deepening-workflow.md 5.3.3 and final-review.md 5.3.1).
const PROMPT_CE_CHECKLISTS = [
  "Requirements: vague or disconnected from the units; success criteria missing or not carried downstream; units do not advance the traced requirements; origin requirements or IDs not carried forward.",
  "Context & Research / Sources & References: patterns named but never used; cited learnings that shape nothing; high-risk work without grounding; research generic rather than tied to this repo.",
  "Key Technical Decisions: a decision without rationale; rationale without tradeoffs or rejected alternatives; no link back to scope or requirements; an obvious fork never addressed; agent or tool features without a decision on parity, shared workspace, tool granularity or approval boundaries.",
  "Open Questions: product blockers hidden as assumptions; planning questions deferred to implementation; resolved questions with no basis; deferred items too vague to use.",
  "High-Level Technical Design: the wrong medium; implementation code rather than pseudo-code; no link to the decisions or units; or, when absent from a Standard or Deep plan, work (an API, a DSL, a multi-component flow, a stateful lifecycle) a sketch would validate.",
  "Implementation Units: unclear or wrong dependency order; missing file or test paths; units too large, vague or micro; thin approach notes; test scenarios without inputs and expected outcomes, or skipping behavior the unit builds; blank scenarios on a feature unit; vague verification; renumbered unit IDs.",
  "System-Wide Impact: missing interfaces, entry points or parity surfaces; weak integration coverage for cross-layer work; agent-facing tools, prompts or approval gates missing.",
  "Risks & Dependencies / Documentation / Operational Notes: a named risk with no decision (neither mitigated nor recorded as considered and not built); weak or unstated external dependency assumptions.",
].join("\n");
const PROMPT_CE_DEPTH = "Plan depth: Lightweight (small, bounded, low ambiguity, usually 2 to 4 units), Standard (moderate complexity, some technical decisions, usually 3 to 6 units) or Deep (cross-cutting, high-risk or strategically important, usually 4 to 8 units).";

// The goal checklist's first item: on an update the request is the update's ask, so the goal is
// judged by THE GOAL, ON AN UPDATE (promptRequestBlock), never as "the one the request asked for"
// (R4-20), and a move toward a source or a finding this run confirmed is asked (R4-29).
const PROMPT_GOAL_ITEM = "- The goal is not the one the request or brief asked for, or narrows, widens or replaces it without saying so.";
const PROMPT_GOAL_ITEM_UPDATE = "- The goal fails THE GOAL, ON AN UPDATE above: it moved from HEAD's version beyond what its sources and this run's confirmed findings ask, or the plan lacks the change the request asks. A move one of them asks for is asked, never a trigger, and a goal no source states is not judged: never a trigger either.";
const PROMPT_OUR_CHECKLISTS = [
  "OUR FOUR CHECKLISTS (CE never scores these sections; score them like CE's):",
  "Goal Capsule and Problem Frame (kind goal-problem):",
  "{goal_item}",
  "- The problem is asserted without evidence it is real: a guard with no incident behind it, a feature with no instance of its population in today's code.",
  "- Success is not observable: nothing a later session could check names the outcome.",
  "- A constraint or non-goal the request or the project's laws name is missing.",
  "Assumptions (kind assumptions):",
  "- A load-bearing claim about the code, a tool or a platform is stated as fact with no source (a file:line, a measurement, a doc).",
  "- An inferred bet sits outside the Assumptions section, unlabeled.",
  "- An assumption whose failure would change a decision or a unit has no check or tripwire that would reveal it.",
  "- An assumption contradicts the contract brief or a rule in the project's CLAUDE.md.",
  "Verification Contract (kind verification):",
  "- A requirement or unit has no verification that would fail on wrong code.",
  "- A check reads only its own success (a green suite, a passing gate) and no outcome observed in the real environment.",
  "- Tests are named without inputs and expected outcomes, or compare default values a missing feature would also produce.",
  "- An absence check (nothing written, no call, no error) has no presence check beside it.",
  "Definition of Done (kind done):",
  "- Done is a ticked task, not an observed outcome.",
  "- Done omits a requirement, a doc that must change, or the landing step.",
  "- Done can be met while a stated success criterion fails.",
  "- Done names no evidence a reviewer could check.",
].join("\n");

// The section limit and the note limit are the size law's (caps.mjs, ctx.laws): never written here,
// so a cap changed there cannot leave a stale number in the rules. The notes rank in select.mjs's
// order (its selectSections sort), so the sections selection picks are the ones that carry a note.
const PROMPT_SCORING = [
  "HOW TO SCORE:",
  "- Score the sections in the index below by what they say, not by their headings' words: give each row the kind whose checklist its content matches. The kinds: {kinds}.",
  "- triggers is the number of checklist problems that apply to the section. Do not add CE's critical-section bonus: the run adds it from the kind and the depth.",
  "- A row covers its heading's subtree: the heading and everything under it, up to the next heading at its level or shallower. Every heading with no deeper heading right after it, and every heading the index marks as having text of its own, except the title, must sit inside some row's subtree; a row at a parent covers its children.",
  "- Cover every section within the size law's limit on sections: when more headings need a row than that limit allows, roll the most alike children into their parent's row until the list fits, and never leave a heading that needs a row outside every row's subtree.",
  "- Never score a heading the index does not list (a checklist section the plan lacks is not a section: its absence is a trigger on the section that should hold it), never score one heading twice, and never put a row at the heading the index marks as the plan's title: a row there covers nothing.",
  "- Each row names its section (the heading's words, shortened to fit) and the line of the index heading it starts at.",
  "- strengthened: {strengthened}",
  "- notes: one for each section with 2 points or more (its triggers, plus 1 when its kind is one of {critical} in a Standard or Deep plan), each carrying its row's line and naming the problems that apply, most serious first. When more sections reach 2 points than the size law allows notes, note the ones that rank highest, in the run's own order: points (less 1 for a row marked strengthened on a plan already deepened), then a row not strengthened before one that was, then a critical kind, then the earlier line. The run hands each note to that section's research helpers as the problems to close.",
  "- depth: Lightweight, Standard or Deep, by the depth rule above.",
  "- risk_signals: every high-risk signal the plan shows, by these keys: {signals}.",
].join("\n");
// select.mjs's title: with more than one heading, a first heading every other sits deeper than. A
// plan with two top-level headings has none, and a row at each of them is legitimate.
const PROMPT_TITLE_MARK = " (the plan's title: no row; its own text needs none)";
const promptTitleOf = (heads) => (heads.length > 1 && heads.slice(1).every((h) => h.level > heads[0].level) ? heads[0] : null);

// The scorer (KTD5 step 1). `deepening` and `finalReview` are CE's files (null when missing: the
// method then comes inline); `index` is flow.mjs index's section index; `deepened` says whether the
// plan already carries a `deepened:` date.
function promptScorer(ctx, { deepening, finalReview, index, deepened } = {}) {
  const dw = promptPathOrNull(deepening, "deepening (CE's deepening-workflow.md)");
  const fr = promptPathOrNull(finalReview, "finalReview (CE's final-review.md)");
  if (typeof deepened !== "boolean") throw new Error("prompts: deepened says whether the plan already carries a deepened: date (true or false)");
  const heads = promptIndex(index);
  const title = promptTitleOf(heads);
  // final-review.md 5.3.2 is CE's gate on whether to deepen, which loads plan-handoff.md and runs the
  // doc review: selection is the run's (select.mjs), so the scorer reads 5.3.1 alone.
  const method = [
    "YOUR METHOD:",
    dw ? promptFill("- Read CE's {dw}, section 5.3.3 (Score Confidence Gaps, with its section checklists), first: it is your scoring method, with the changes below.", { dw }) : promptFill("- CE's deepening-workflow.md is missing in this run (the receipt names the scorer as run without it), so score against these checklists, read in CE 3.37.0's section 5.3.3:\n{lists}", { lists: PROMPT_CE_CHECKLISTS }),
    fr ? promptFill("- Read CE's {fr}, section 5.3.1 alone (the plan's depth and its risk profile), for depth and risk_signals. Never run its section 5.3.2 (CE's gate on whether to deepen) or anything that section loads: choosing the sections to deepen is the run's.", { fr }) : promptFill("- CE's final-review.md is missing in this run, so take depth and risk from these, read in CE 3.37.0's section 5.3.1: {depth}", { depth: PROMPT_CE_DEPTH }),
  ].join("\n");
  const asked = promptRequestBlock(ctx);
  const prompt = promptJoin([
    promptFill("You are the scorer in the deepen of a plan: {plan}. You score every section of the plan for confidence gaps, so the run can pick the sections a research pass strengthens (KTD5). You change nothing.", { plan: promptPath(ctx?.plan, "ctx.plan") }),
    asked,
    promptUpdateBlock(ctx),
    method,
    dw || fr ? PROMPT_LENS_RULE : null,
    promptFill(PROMPT_OUR_CHECKLISTS, { goal_item: ctx.update ? PROMPT_GOAL_ITEM_UPDATE : PROMPT_GOAL_ITEM }),
    promptFill(PROMPT_SCORING, {
      kinds: Object.entries(PROMPT_KINDS).map(([k, v]) => `${k} (${v})`).join("; "),
      critical: PROMPT_CRITICAL.join(", "),
      signals: Object.entries(PROMPT_RISKS).map(([k, v]) => `${k} (${v})`).join("; "),
      strengthened: deepened
        ? "this plan carries a deepened: date, so set strengthened true on each section an earlier deepen substantially strengthened, and false on the rest."
        : "this plan has never been deepened, so strengthened is false on every row.",
    }),
    "THE SECTION INDEX (every heading outside fences and front matter, by its line):\n" + heads.map((h) => `- line ${h.line}: ${"#".repeat(h.level)} ${h.heading}${h === title ? PROMPT_TITLE_MARK : h.own ? " (has text of its own)" : ""}`).join("\n"),
    promptPagingBlock(ctx),
    promptLawsBlock(ctx),
    promptToolsBlock(PROMPT_READ_ONLY),
    "RETURN ONLY the structured object.",
    promptLaw(ctx, "scorer"),
  ]);
  return { prompt, schema: "scorer", endsAt: promptLastLine(ctx).line };
}

// A section's span in the plan: its heading's line to the line before the next heading at its
// level or shallower, or the plan's last line.
function promptSpan(heads, line, lastLine) {
  const i = heads.findIndex((h) => h.line === line);
  if (i < 0) throw new Error(`prompts: line ${line} is no heading in the plan's section index`);
  // A title row covers nothing, and its span is the whole plan: select.mjs never picks one, and this
  // is the backstop (U4's R4-23).
  if (promptTitleOf(heads) === heads[i]) throw new Error(`prompts: line ${line} is the plan's title, which is no section to deepen`);
  for (let j = i + 1; j < heads.length; j++) if (heads[j].level <= heads[i].level) return { from: line, to: heads[j].line - 1, heading: heads[i].heading };
  return { from: line, to: lastLine, heading: heads[i].heading };
}

// One deepen research helper for one selected section (KTD5 step 3), seeded from the CE agent file
// CE's section-to-agent mapping names (null when missing). `triggers` is the scorer's note for the
// section; `depth` and `risk` its recorded profile; `learnings` the learnings researcher's lesson
// roots and `focus` an external researcher's, as in research.
function promptAmendment(ctx, { agent, agentFile, scope = null, line, index, triggers, depth, risk, learnings = null, focus = null } = {}) {
  if (!PROMPT_AGENTS.includes(agent)) throw new Error(`prompts: ${JSON.stringify(agent)} is not a deepen agent (one of: ${PROMPT_AGENTS.join(", ")})`);
  const file = promptPathOrNull(agentFile, "agentFile");
  if (!Array.isArray(risk) || risk.some((r) => !Object.hasOwn(PROMPT_RISKS, r))) throw new Error(`prompts: risk is the list of the plan's risk signals (each one of: ${Object.keys(PROMPT_RISKS).join(", ")})`);
  const where = promptLearningsBlock(agent, learnings);
  // The outside-first job keys on the agent, never on a focus (R4-18): with none, a naive fallback
  // would send an external researcher repo-first again. outside_ran is how its failure comes back
  // (caps.mjs's amendment schema, read fail-closed by U5, R4-19).
  const external = PROMPT_EXTERNAL.includes(agent);
  if (!external && focus !== null && focus !== undefined) throw new Error(`prompts: focus is for the external researchers only (${PROMPT_EXTERNAL.join(", ")}), not ${agent}`);
  const outside = external ? (focus === null || focus === undefined ? null : promptText(focus, "focus (the external note's reason, when its call ran outside research)")) : null;
  const last = promptLastLine(ctx);
  const span = promptSpan(promptIndex(index), line, last.line);
  const job = external
    ? `YOUR JOB: research what would close each problem in ${promptOutsideFirst(outside)} Set outside_ran true only when a web search ran and every page you cite as read was fetched; when outside research cannot run (no web tool answers), set it false and propose only what the repo supports.`
    : "YOUR JOB: research what would close each problem, grounded in this repo first (its code, its docs, its CLAUDE.md files and its docs/insights/) and in outside sources only where the repo cannot answer.";
  const prompt = promptJoin([
    promptFill("You strengthen one section of a plan in its deepen: {plan}. The repo it will change: {project}.", { plan: promptPath(ctx?.plan, "ctx.plan"), project: promptPath(ctx?.project, "ctx.project") }),
    promptAgentBlock(agent, file, scope, "your return is this prompt's structured object, not the agent file's format, and you write no file"),
    file ? PROMPT_LENS_RULE : null,
    promptRequestBlock(ctx),
    // On an update the named path holds the plan's own words, which an amendment must never cite as
    // evidence (round 2's advisory, R4-20).
    promptUpdateBlock(ctx),
    promptFill("THE SECTION: \"{heading}\", lines {from} to {to} of the plan. Read those lines first, then as much of the rest of the plan as your work needs (Read with offset and limit: one Read returns only part of a large file).\nWHY IT WAS PICKED: the scorer found these problems in it: {triggers}\nTHE PLAN'S DEPTH AND RISK: {depth}; high-risk signals: {risk}.", {
      heading: span.heading,
      from: String(span.from),
      to: String(span.to),
      triggers: promptText(triggers, "triggers (the scorer's note for the section)"),
      depth: promptText(depth, "depth (the scorer's plan depth)"),
      risk: risk.length ? risk.join(", ") : "none",
    }),
    where,
    `${job} Propose amendments: each names its section, the gap it closes (the problem above that it answers, with the plan line it rests on), a severity (P1 when it changes a decision or a unit, P2 otherwise), the change (the new or replacement text, or the exact edit in plain words), its evidence (a file:line, a measurement or a dated source), and old_values (up to three exact phrases the change replaces, at least 3 characters each, so the fold can find every other place that still says them; an empty list when the change replaces nothing). No implementation code and no shell commands in a change (CE's rule): a plan states decisions, not code. Every amendment goes to verifiers before it touches the plan.`,
    promptLawsBlock(ctx),
    PROMPT_SETTLED,
    promptToolsBlock(PROMPT_READ_ONLY),
    "RETURN ONLY the structured object.",
    promptLaw(ctx, "amendment"),
  ]);
  return { prompt, schema: "amendment" };
}

// ---------------------------------------------------------------- the verifiers (KTD8)

// The section an amendment amends, by its span, and why the scorer picked it.
function promptAmendedSection(ctx, line, index, triggers) {
  const span = promptSpan(promptIndex(index), line, promptLastLine(ctx).line);
  return promptFill("THE SECTION IT AMENDS: \"{heading}\", lines {from} to {to} of the plan.\nWHY IT WAS PICKED: the scorer found these problems in it: {triggers}", { heading: span.heading, from: String(span.from), to: String(span.to), triggers: promptText(triggers, "triggers (the scorer's note for the section)") });
}

// One verifier vote on one finding (a premise or check seat's) or one deepen amendment, on one
// refuter angle (an index into PROMPT_REFUTER_ANGLES). The three words are KTD8's: real, material
// and new, tallied separately, and the proposed change is judged as its own question (ultramode
// insight 001: convergence on a finding says nothing about its fix). An amendment's verifier is
// shown the section it amends (`line` in the section `index`) and why the scorer picked it
// (`triggers`, its note), so "real" judges the gap the amendment states against the section itself.
function promptVerifier(ctx, { item, kind, angle, line, index, triggers } = {}) {
  if (kind !== "finding" && kind !== "amendment") throw new Error(`prompts: kind is "finding" or "amendment"; got ${JSON.stringify(kind)}`);
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`prompts: the ${kind} to verify is required, as an object`);
  if (!Number.isInteger(angle) || angle < 0 || angle >= PROMPT_REFUTER_ANGLES.length) throw new Error(`prompts: angle is an index into PROMPT_REFUTER_ANGLES (0 to ${PROMPT_REFUTER_ANGLES.length - 1}); got ${JSON.stringify(angle)}`);
  const finding = kind === "finding";
  if (finding && [line, index, triggers].some((v) => v !== undefined)) throw new Error("prompts: line, index and triggers are only for an amendment's verifier (the section it amends and why it was picked)");
  const section = finding ? null : promptAmendedSection(ctx, line, index, triggers);
  const prompt = promptJoin([
    promptFill("You are an adversarial VERIFIER in a planning run. The plan: {plan}. The repo it will change: {project}.\nA confident {kind} is a hypothesis, not a verdict: your job is to refute it by reading the plan and the actual source. Default real=false when you cannot confirm it.\nYOUR REFUTER ANGLE: {angle}", {
      plan: promptPath(ctx?.plan, "ctx.plan"),
      project: promptPath(ctx?.project, "ctx.project"),
      kind,
      angle: PROMPT_REFUTER_ANGLES[angle],
    }),
    promptRequestBlock(ctx),
    promptUpdateBlock(ctx),
    promptFill("THE {label} (JSON): {item}\nRead the plan lines it cites (Read with offset and limit), as much more of the plan as the question needs, and the code or docs its evidence names.", { label: finding ? "FINDING" : "PROPOSED AMENDMENT", item: JSON.stringify(item) }),
    section,
    [
      "Answer each question on its own: they are tallied separately, so never fold one into another.",
      finding
        ? "- real: the gap exists as stated: the plan says what the finding claims it says, and the source it cites says what the finding claims."
        : "- real: the gap the amendment states exists (read the section's lines), and its evidence holds in source.",
      "- material: it changes what gets built or how it is verified. A wording preference, or a change that builds the same thing, is not material.",
      "- new: the plan does not already say or address it. Another section, a unit, a test scenario or an assumption that already covers it means not new.",
      finding
        ? `- corrected_severity: P0 to P3, by what the plan and the source show, on the finders' ladder: ${PROMPT_LADDER} 'drop' when it should not stand.`
        : "- corrected_severity: P1 when the change alters a decision or a unit, P2 otherwise; 'drop' when it should not stand.",
      "- fix_is_correct: is the proposed change right, or could it be directionally wrong, break another section, or contradict a settled decision? When it is wrong or incomplete, give better_fix; else ''.",
      "Return ONLY the structured verdict, with its evidence.",
    ].join("\n"),
    promptLawsBlock(ctx),
    PROMPT_SETTLED,
    promptToolsBlock(PROMPT_READ_ONLY),
    promptLaw(ctx, "verdict"),
  ]);
  return { prompt, schema: "verdict" };
}

// ---------------------------------------------------------------- the check (KTD6)

// A panel seat's angle line (KTD6, KTD9). With every other panelist running it hunts its own seam,
// and the roster names the other owners. In a later round flow.mjs runs only the touched seats, so
// a panelist may run without the others: the first panelist in the roster then leads with its own
// angle and reports the absent panelists' seams too, and any other running panelist names it.
function promptAngleLine(seat, running) {
  const s = PROMPT_CHECK_SEATS[seat];
  if (!s.angle) return PROMPT_ADVERSARY_ANGLES;
  const panel = Object.keys(PROMPT_CHECK_SEATS).filter((k) => PROMPT_CHECK_SEATS[k].angle);
  const absent = panel.filter((k) => !running.includes(k));
  const first = running.find((k) => panel.includes(k));
  if (absent.length === 0) return `YOUR ASSIGNED ANGLE, hunt only this seam (the roster names the other owners): ${s.angle}.`;
  if (first !== seat) return `YOUR ASSIGNED ANGLE, hunt only this seam (the roster names the other owners, and ${first} reports the seams of the panelists not running): ${s.angle}.`;
  return `YOUR ASSIGNED ANGLE, lead with this seam: ${s.angle}. The panelists who own these seams are not running this round, so report them too: ${absent.map((k) => PROMPT_CHECK_SEATS[k].angle).join("; ")}.`;
}

// One check seat (KTD6). `persona` is the seat's CE persona file, or null when resolve-ce.mjs's
// fileOf answered missing; a seat that reads a CE file must be given it, since an omitted persona
// would build as "run without its file" while the receipt, read from the resolution, names no such
// seat (R4-33). Our three seats read none, so theirs is null or left out. `roster` is the seats
// running, the premise seat among them when it runs (promptPremise builds it); `round` 1, 2 or 3,
// required, with `changes` (the fold's changes, each { kind, text }, an edit with `was` too) after
// round 1 (KTD9).
function promptCheckSeat(ctx, { seat, persona, roster, round, changes = [] } = {}) {
  if (seat === "premise") throw new Error("prompts: the check's premise seat is built by promptPremise in check mode");
  if (!Object.hasOwn(PROMPT_CHECK_SEATS, seat)) throw new Error(`prompts: ${JSON.stringify(seat)} is no check seat (one of: ${Object.keys(PROMPT_CHECK_SEATS).join(", ")})`);
  const s = PROMPT_CHECK_SEATS[seat];
  if (s.ce !== null && persona === undefined) throw new Error(`prompts: ${seat} reads CE's ${s.ce} persona file, so persona is required: its path, or null when fileOf answered missing (an omitted persona would build as run without its file, which the receipt never names)`);
  const file = persona === undefined ? null : promptPathOrNull(persona, "persona");
  if (s.ce === null && file !== null) throw new Error(`prompts: ${seat} reads no CE file, so it takes no persona`);
  const running = promptRoster(roster, seat);
  const roundBlock = promptRoundBlock(round, changes, promptLastLine(ctx));
  const asked = promptRequestBlock(ctx);
  const prompt = promptJoin([
    promptFill("You are the {seat} seat in the check of a plan: {plan}. {state} ({project}).\nYOUR LENS: {role}", {
      seat,
      plan: promptPath(ctx?.plan, "ctx.plan"),
      state: promptPlanState(ctx, "review the plan itself"),
      project: promptPath(ctx?.project, "ctx.project"),
      role: s.role,
    }),
    asked,
    promptUpdateBlock(ctx),
    promptFill("YOUR CLASS: {owns}. A finding in your class is never a false positive here: CE's false-positive catalog entry for \"pre-existing issues the document's work does not reach\" does not apply to it, because the build rests on what the plan states, whether or not the problem predates the plan.", { owns: s.owns }),
    promptRosterBlock(running),
    s.ce === null
      ? "This seat reads no CE file: the lens above is its whole role."
      : file
        ? promptJoin([promptFill(PROMPT_PERSONA, { persona: file }), PROMPT_LENS_RULE])
        : "CE's persona file for this seat is missing in this run, so the lens above is your whole role (the receipt names this seat as run without its file).",
    promptPagingBlock(ctx),
    promptLawsBlock(ctx),
    PROMPT_SETTLED,
    promptToolsBlock(PROMPT_READ_ONLY),
    roundBlock,
    s.adversary ? promptFill(PROMPT_ADVERSARY, { angle_line: promptAngleLine(seat, running) }) : null,
    PROMPT_FINDER_RETURN,
    promptLaw(ctx, "finder"),
  ]);
  return { prompt, schema: "finder", endsAt: promptLastLine(ctx).line };
}

// ---------------------------------------------------------------- the re-run of a short reader (KTD7)

// A whole-plan reader whose read failed KTD7's check is re-run once, inside its script, with a head
// naming what went wrong (a resume would replay its cached short read). Since R4-1 every reader is
// told the last line's number, so a reader that never reached it can echo it and fail only on its
// quote or its page count, and since R4-6 a selected scorer row with no note is a short read too:
// `reasons` names the kinds (R4-17), each at most once:
//   stopped    it reported a last line under the plan's: `stoppedAt` is that line (0 when it quoted
//              none), under the built prompt's endsAt, and `missed` every section whose span runs
//              past it, the one holding it included, so a stop inside the last section is never an
//              empty list;
//   inventory  it reported no line under the plan's last, but its inventory failed the run's check
//              (the quote is no prefix of the last line, pages_read is under ceil(N / PROMPT_PAGE),
//              the number runs past the last line, or a field is missing): `missed` may name the
//              sections the run cannot confirm, or be empty or left out; the head never prints the
//              last line's text, which the reader's quote is checked against, and never asks for it
//              "exactly" (a model miscounts exactly 120 characters);
//   notes      the scorer's alone: `noNote` lists the selected rows with no note, each
//              { line, heading }, and the head asks for a note on each that still scores 2 points or
//              more after the re-score, never forcing one.
// stopped and inventory exclude each other; notes goes with either, or alone (the read was whole).
const PROMPT_SHORT_KINDS = ["stopped", "inventory", "notes"];
// A list of { line, heading } sections, each a heading line of the plan (1 to its last line), none
// twice, rendered one per line.
function promptSectionList(list, name, label, endsAt) {
  const seen = new Set();
  for (const m of list) {
    if (!m || !Number.isInteger(m.line) || m.line < 1 || m.line > endsAt || typeof m.heading !== "string" || !m.heading.trim()) throw new Error(`prompts: a ${label} is { line, heading }, a heading of the plan (lines 1 to ${endsAt}); got ${JSON.stringify(m)}`);
    if (seen.has(m.line)) throw new Error(`prompts: ${name} names line ${m.line} twice`);
    seen.add(m.line);
  }
  return list.map((m) => `- line ${m.line}: ${m.heading.trim()}`).join("\n");
}
function promptShortRead(built, { reasons, stoppedAt, missed, noNote } = {}) {
  if (!built || typeof built.prompt !== "string" || (built.schema !== "finder" && built.schema !== "scorer") || !Number.isInteger(built.endsAt) || built.endsAt < 1) throw new Error("prompts: a short read re-runs a whole-plan reader's built prompt (a finder or the scorer, carrying the endsAt its builder set)");
  if (!Array.isArray(reasons) || reasons.length === 0) throw new Error(`prompts: reasons is a non-empty list of the short read's kinds (${PROMPT_SHORT_KINDS.join(", ")}); got ${JSON.stringify(reasons)}`);
  for (const r of reasons) if (!PROMPT_SHORT_KINDS.includes(r)) throw new Error(`prompts: ${JSON.stringify(r)} is no short-read kind (one of: ${PROMPT_SHORT_KINDS.join(", ")})`);
  if (new Set(reasons).size !== reasons.length) throw new Error("prompts: reasons names a kind twice");
  const stopped = reasons.includes("stopped");
  const inventory = reasons.includes("inventory");
  const notes = reasons.includes("notes");
  if (stopped && inventory) throw new Error("prompts: stopped and inventory exclude each other: a reader that reported a line under the last stopped short, and one that did not failed its inventory");
  if (!stopped && stoppedAt !== undefined) throw new Error("prompts: stoppedAt is for a stopped read only");
  if (!notes && noNote !== undefined) throw new Error("prompts: noNote goes with the notes kind only");
  const heads = [];
  if (stopped) {
    if (!Number.isInteger(stoppedAt) || stoppedAt < 0) throw new Error("prompts: stoppedAt is the last line the short read reached (0 when it quoted none)");
    if (stoppedAt >= built.endsAt) throw new Error(`prompts: a stopped read's stoppedAt is under the plan's last line (${built.endsAt}); a reader that reported the last line failed its inventory instead`);
    if (!Array.isArray(missed) || missed.length === 0) throw new Error("prompts: a stopped read names the sections it missed (every section whose span runs past stoppedAt, the one holding it included)");
    heads.push(promptFill("YOUR LAST READ OF THIS PLAN STOPPED SHORT at line {stopped}, so these sections were not read to their end:\n{missed}\nRead the plan to its last line this time, these sections included, before you return.", {
      stopped: String(stoppedAt),
      missed: promptSectionList(missed, "missed", "missed section", built.endsAt),
    }));
  } else if (inventory) {
    if (missed !== undefined && !Array.isArray(missed)) throw new Error("prompts: missed is a list of { line, heading } (empty or left out when the run can name no section)");
    const unconfirmed = missed?.length ? promptSectionList(missed, "missed", "missed section", built.endsAt) : null;
    heads.push(promptFill("YOUR LAST READ OF THIS PLAN FAILED THE RUN'S CHECK OF ITS READING INVENTORY (the last line's number and text, and pages_read), so the run cannot confirm you read the whole plan. Read it again from line 1, in pages of at most {page} lines, in order, to the last line the prompt below names, and return the inventory from that read.", { page: String(PROMPT_PAGE) }) + (unconfirmed ? `\nThe sections the run cannot confirm you read:\n${unconfirmed}` : ""));
  } else if (missed !== undefined && (!Array.isArray(missed) || missed.length)) {
    throw new Error("prompts: a notes-only re-run read the whole plan, so it names no missed section");
  }
  if (notes) {
    if (built.schema !== "scorer") throw new Error("prompts: notes are the scorer's alone (a selected row with no note)");
    if (!Array.isArray(noNote) || noNote.length === 0) throw new Error("prompts: noNote is the selected rows with no note, each { line, heading }, at least one");
    heads.push(promptFill("YOUR LAST SCORING GAVE NO NOTE TO THESE SECTIONS, which the run selected to deepen:\n{rows}\nScore the plan again as the prompt below asks, and give each of these sections a note naming its problems when it still scores 2 points or more, in the run's own rank order; one that now scores under 2 needs no note.", {
      rows: promptSectionList(noNote, "noNote", "row with no note", built.endsAt),
    }));
  }
  return { prompt: promptJoin([...heads, "This is your one re-run of the prompt below.", built.prompt]), schema: built.schema, endsAt: built.endsAt };
}

// ---------------------------------------------------------------- the lens picks (KTD6)

// The main loop's own read of CE's persona-selection.md (null when missing: the signals come inline,
// read in CE 3.37.0). It picks the conditional lenses only; the four always-on seats always run, and
// depth.md's lite review never does. depth.md's rule for judging activation (from what the plan's
// named code paths touch) is stated here, in both branches, since its lite-or-full choice is not ours.
function promptLensPicks({ plan, personaSelection } = {}) {
  const file = promptPathOrNull(personaSelection, "personaSelection (CE's persona-selection.md)");
  const prompt = promptJoin([
    file
      ? promptFill("THE LENS PICKS (KTD6): read {file} (CE's persona-selection.md). Use only its activation signals for product-lens, security-lens and design-lens.", { file })
      : "THE LENS PICKS (KTD6): CE's persona-selection.md is missing in this run (the receipt names the lens picks as run without it), so use these signals, read in CE 3.37.0: product, the plan stakes a product position no upstream product contract settled, or carries strategic weight beyond the immediate problem; security, authentication or authorization, external endpoints, sensitive data (personal data, payments, tokens, secrets) or a trust boundary; design, user interface, user flows, interaction or accessibility.",
    promptFill("Judge the signals against the staged plan at {plan}. Judge each signal from the plan's text and from what the files and code paths it names actually do: open those paths and read enough to see what they touch, never the rest of the repository. Reading or showing ordinary, non-sensitive data, storage churn, or a non-sensitive endpoint is not a signal on its own. Coherence, feasibility, scope-guardian and the adversary always run here, whatever the file says: never use depth.md's choice between a lite and a full review, and never drop an always-on seat.", { plan: promptPath(plan, "plan (the staged plan)") }),
    "Record the picks in one note: key lenses, value a list holding, for each lens picked (product, security or design), an object with its lens and its reason in a few words; an empty list when none is picked.",
    file ? PROMPT_LENS_RULE : null,
  ]);
  return { prompt, schema: null };
}
// ---------------------------------------------------------------- end of lib/prompts.mjs

// ---------------------------------------------------------------- inlined from lib/reads.mjs (edit the module, then run: node lib/make-scripts.mjs write)
// THE SCRIPTS' GATES (U5 of docs/plans/hybrid-plan-step-plan.md): KTD7's check of a whole-plan
// reader's inventory, the scorer's notes check, and the args check every Workflow script runs before
// its first agent() call. Each gate lives here, as plain functions, so it is tested at its edges
// (playbook insight 013: a gate only ever exercised far from its edge has never been tested), not
// only through the stub.
//
// Pure and import-free: U5's generator inlines this file into every Workflow script, so it reads no
// file, no clock and no random number, and every top-level name starts with `reads` or `READS_`
// (entry.test.mjs holds the inlined modules to unique names). The page size and the quote floor are
// inputs, never copies: a script passes prompts.mjs's PROMPT_PAGE and PROMPT_QUOTE_FLOOR, which the
// prompts told the reader (U4's R4-1 and R4-32).
//
// KTD7, as built in U4 (R4-1, R4-17): a reader is told the last line's number, never its text, and
// returns an inventory (caps.mjs's last_line_number, last_line_text, pages_read). It fails by kind:
//   stopped    it reported a last line under the plan's last line with text (N); it missed every
//              section whose span runs past the line it reported, the one holding that line included,
//              so a stop inside the last section still names one;
//   inventory  it reported no line under N, but its inventory fails the check: a number past N, a
//              field left out, a quote that is no prefix of the true last line (both ends trimmed) or
//              shorter than min(the line's trimmed length, the floor), or pages_read under
//              ceil(N / the page size). No section of its read is confirmed, so all of them are missed;
//   notes      the scorer's alone: a row selection picked whose line has no note, or only a blank one
//              (prompts.mjs's promptAmendment refuses empty triggers), joined by line, since two
//              sections can share a heading (U4's R4-6).
// stopped and inventory exclude each other (a number under N is a stop, whatever else is wrong);
// notes goes with either, or alone. A section here is an index heading other than the plan's title
// (a first heading every other one sits deeper than: select.mjs's and prompts.mjs's rule), and its
// span runs from its heading to the line before the next heading at its level or shallower, or to N.
// A span takes in the blank lines before the next heading, so a reader that stopped on a section's
// last line of text names that section too: one more section, never one fewer.

// The short read's kinds, in promptShortRead's words (prompts.mjs's PROMPT_SHORT_KINDS, tested).
const READS_KINDS = ["stopped", "inventory", "notes"];

const readsInt = (v) => Number.isInteger(v);

// What is wrong with a section index (flow.mjs index's `index`), or null when nothing is: each entry
// { line, level, heading, own } (select.mjs reads the same entries), a heading line 1 or past, a level
// 1 to 6, heading text (an ATX heading may have none) and whether it has text of its own; no line
// twice. The order does not matter.
function readsIndexProblem(index) {
  if (!Array.isArray(index) || index.length === 0) return "the section index is a non-empty list (flow.mjs index's index)";
  const seen = new Set();
  for (const h of index) {
    if (!h || typeof h !== "object" || !readsInt(h.line) || h.line < 1 || !readsInt(h.level) || h.level < 1 || h.level > 6 || typeof h.heading !== "string" || typeof h.own !== "boolean") {
      return `a section index entry is { line, level, heading, own }; got ${JSON.stringify(h)}`;
    }
    if (seen.has(h.line)) return `the section index lists line ${h.line} twice`;
    seen.add(h.line);
  }
  return null;
}

// What is wrong with the plan's last line with text (flow.mjs index's `last`), or null.
function readsLastProblem(last) {
  if (!last || typeof last !== "object" || !readsInt(last.line) || last.line < 1 || typeof last.text !== "string" || !last.text.trim()) {
    return "the plan's last line is { line, text }, its last line holding text and that line's number (flow.mjs index's last)";
  }
  return null;
}

function readsThrow(problem) {
  if (problem) throw new Error(`reads: ${problem}`);
}

function readsWhole(v, what) {
  if (!readsInt(v) || v < 1) throw new Error(`reads: ${what} is a whole number, 1 or more; got ${JSON.stringify(v)}`);
  return v;
}

// The plan's sections, in document order, each { line, heading, to }: every index heading but the
// title, `to` the last line of its span (N for the last at its level).
function readsSections(index, lastLine) {
  readsThrow(readsIndexProblem(index));
  readsWhole(lastLine, "the plan's last line");
  const heads = [...index].sort((a, b) => a.line - b.line);
  if (heads[heads.length - 1].line > lastLine) throw new Error(`reads: the section index has a heading at line ${heads[heads.length - 1].line}, past the plan's last line (${lastLine})`);
  const title = heads.length > 1 && heads.slice(1).every((h) => h.level > heads[0].level) ? heads[0] : null;
  const out = [];
  heads.forEach((h, i) => {
    if (h === title) return;
    let to = lastLine;
    for (let j = i + 1; j < heads.length; j++) {
      if (heads[j].level <= h.level) {
        to = heads[j].line - 1;
        break;
      }
    }
    out.push({ line: h.line, heading: h.heading.trim() || "(a heading with no text)", to });
  });
  return out;
}

// The sections a read that stopped at `stoppedAt` missed: every one whose span runs past it, as
// { line, heading } (promptShortRead's missed). 0 misses them all.
function readsMissed(index, lastLine, stoppedAt) {
  if (!readsInt(stoppedAt) || stoppedAt < 0) throw new Error(`reads: stoppedAt is the last line a read reached, 0 or more; got ${JSON.stringify(stoppedAt)}`);
  return readsSections(index, lastLine).filter((s) => s.to > stoppedAt).map((s) => ({ line: s.line, heading: s.heading }));
}

// KTD7's check of one reader's inventory. `inventory` is the reader's answer (the finder's or the
// scorer's object; any other value counts as an inventory with every field left out); `last` the
// plan's last line with text; `index` the section index; `endsAt` the built prompt's endsAt, which
// must be the last line's number; `page` the page size and `floor` the quote floor the prompts told
// the reader. Answers { ok: true }, or { ok: false, reasons: [kind], stoppedAt (stopped only),
// missed, problems }: `missed` the sections it missed (for a stopped read the ones past the stop, for
// a failed inventory every section), `problems` what failed, in words that never hold the last line's
// text, which the check compares a quote against.
function readsInventory(inventory, { last, index, endsAt, page, floor } = {}) {
  readsThrow(readsLastProblem(last));
  readsWhole(endsAt, "endsAt");
  if (endsAt !== last.line) throw new Error(`reads: the built prompt's endsAt (${endsAt}) is not the plan's last line (${last.line}), so the reader was told another line than the one it is checked against`);
  readsWhole(page, "the page size");
  readsWhole(floor, "the quote floor");
  const sections = readsSections(index, last.line);
  const inv = inventory && typeof inventory === "object" && !Array.isArray(inventory) ? inventory : {};
  const n = inv.last_line_number;
  if (readsInt(n) && n >= 0 && n < last.line) {
    return { ok: false, reasons: ["stopped"], stoppedAt: n, missed: readsMissed(index, last.line, n), problems: [`it read to line ${n}, under the plan's last line (${last.line})`] };
  }
  const problems = [];
  if (n === undefined) problems.push("no last_line_number");
  else if (!readsInt(n) || n < 0) problems.push(`last_line_number ${JSON.stringify(n)} is no line number`);
  else if (n > last.line) problems.push(`last_line_number ${n} is past the plan's last line (${last.line})`);
  const quote = inv.last_line_text;
  if (typeof quote !== "string") problems.push("no last_line_text");
  else {
    const want = last.text.trim();
    const got = quote.trim();
    const need = Math.min(want.length, floor);
    if (got.length < need) problems.push(`last_line_text holds ${got.length} characters trimmed, under the ${need} the check needs`);
    else if (!want.startsWith(got)) problems.push("last_line_text is no prefix of the plan's last line");
  }
  const pages = inv.pages_read;
  const fewest = Math.ceil(last.line / page);
  if (!readsInt(pages)) problems.push("no pages_read");
  else if (pages < fewest) problems.push(`pages_read ${pages} is under ${fewest}, the fewest pages of ${page} lines that reach line ${last.line}`);
  if (problems.length === 0) return { ok: true };
  return { ok: false, reasons: ["inventory"], missed: sections.map((s) => ({ line: s.line, heading: s.heading })), problems };
}

// The scorer's notes against the rows selection picked (select.mjs's sections, each with its line):
// { noted, noNote }, each a list in the rows' order. `noted` holds { line, heading, triggers } for each
// row with a note, the text of every non-blank note at its line joined; `noNote` holds { line, heading }
// for each row with none (promptShortRead's noNote). A note at a line no selected row starts at is
// ignored, and a note whose triggers_named is blank counts as none. The heading is the index's.
function readsNotes({ selected, notes, index } = {}) {
  readsThrow(readsIndexProblem(index));
  if (!Array.isArray(selected)) throw new Error("reads: selected is the list of rows selection picked (select.mjs's sections)");
  if (notes !== undefined && notes !== null && !Array.isArray(notes)) throw new Error("reads: notes is the scorer's list of notes, or left out");
  const headingAt = new Map(index.map((h) => [h.line, h.heading.trim() || "(a heading with no text)"]));
  const noted = [];
  const noNote = [];
  const rows = new Set();
  for (const r of selected) {
    if (!r || !readsInt(r.line) || !headingAt.has(r.line)) throw new Error(`reads: a selected row starts at a heading of the index; got ${JSON.stringify(r)}`);
    if (rows.has(r.line)) throw new Error(`reads: line ${r.line} is selected twice`);
    rows.add(r.line);
    const texts = (notes ?? []).filter((x) => x && x.line === r.line && typeof x.triggers_named === "string" && x.triggers_named.trim()).map((x) => x.triggers_named.trim());
    if (texts.length) noted.push({ line: r.line, heading: headingAt.get(r.line), triggers: texts.join("; ") });
    else noNote.push({ line: r.line, heading: headingAt.get(r.line) });
  }
  return { noted, noNote };
}

// The options of a reader's one re-run (promptShortRead's), from its inventory check and, for the
// scorer, its notes check; null when neither failed. A stopped read names its stop and the sections it
// missed; a failed inventory names none (the run confirmed none, and the re-run reads from line 1);
// notes names the rows with no note.
function readsRerun(read, notes = null) {
  if (!read || typeof read.ok !== "boolean") throw new Error("reads: read is readsInventory's answer");
  const reasons = read.ok ? [] : [...read.reasons];
  const out = {};
  if (reasons.includes("stopped")) {
    out.stoppedAt = read.stoppedAt;
    out.missed = read.missed;
  }
  if (notes && notes.noNote.length) {
    reasons.push("notes");
    out.noNote = notes.noNote;
  }
  return reasons.length ? { reasons, ...out } : null;
}

// ---------------------------------------------------------------- the CE files a script names

// An absolute path, in Windows (C:/ or C:\) or POSIX form (prompts.mjs's promptPath rule).
const readsIsPath = (v) => typeof v === "string" && /^(?:[A-Za-z]:[\\/]|\/)/.test(v);

// What is wrong with a CE resolution (resolve-ce.mjs's, from the run record's ce/Cn.json), or null:
// a files list, each file with its key and exactly one of sha256 (with its absolute path) and
// missing. A script reads its agent and persona files from it, never from a fresh resolve (U3's
// hand-on), and resolve-ce.mjs's checkResolution has already held it to the resolver's full list.
function readsCeProblem(ce) {
  if (!ce || typeof ce !== "object" || !Array.isArray(ce.files) || ce.files.length === 0) return "the CE resolution is resolve-ce.mjs's object, its files list included (the run record's ce/Cn.json)";
  const keys = new Set();
  for (const f of ce.files) {
    if (!f || typeof f.key !== "string" || !f.key) return `a CE file entry names its key; got ${JSON.stringify(f)}`;
    if (keys.has(f.key)) return `the CE resolution lists ${f.key} twice`;
    keys.add(f.key);
    const has = ["sha256", "missing"].filter((k) => k in f);
    if (has.length !== 1) return `the CE file ${f.key} needs exactly one of sha256 and missing`;
    if ("sha256" in f && !readsIsPath(f.path)) return `the CE file ${f.key} has a sha256 but no absolute path`;
  }
  return null;
}

// One CE file's absolute path by its key, or null when the resolution lists it missing: its seat
// then runs its inline role (KTD2). A key the resolution does not list throws (a script's own bug).
function readsCeFile(ce, key) {
  readsThrow(readsCeProblem(ce));
  const f = ce.files.find((x) => x.key === key);
  if (!f) throw new Error(`reads: the CE resolution lists no file keyed ${JSON.stringify(key)}`);
  return "sha256" in f ? f.path : null;
}

// ---------------------------------------------------------------- the args check

// The kinds an args field may be: a word (a "?" after it also takes null), or a function that answers
// what is wrong with the value, null when nothing is.
const READS_ARG_KINDS = {
  text: (v) => (typeof v === "string" && v.trim() ? null : "non-empty text"),
  path: (v) => (readsIsPath(v) ? null : "an absolute path"),
  list: (v) => (Array.isArray(v) ? null : "a list"),
  object: (v) => (v && typeof v === "object" && !Array.isArray(v) ? null : "an object"),
  bool: (v) => (typeof v === "boolean" ? null : "true or false"),
  int: (v) => (readsInt(v) && v >= 0 ? null : "a whole number, 0 or more"),
  any: () => null,
};

function readsArgProblem(kind, v) {
  if (typeof kind === "function") return kind(v);
  if (typeof kind !== "string") throw new Error(`reads: an args kind is a word (${Object.keys(READS_ARG_KINDS).join(", ")}, each with an optional "?" for null) or a function; got ${JSON.stringify(kind)}`);
  const nullable = kind.endsWith("?");
  const word = nullable ? kind.slice(0, -1) : kind;
  const check = READS_ARG_KINDS[word];
  if (!check) throw new Error(`reads: ${JSON.stringify(kind)} is no args kind (one of: ${Object.keys(READS_ARG_KINDS).join(", ")}, each with an optional "?" for null)`);
  if (v === null) return nullable ? null : `${check(undefined) ?? "a value"}, not null`;
  const wrong = check(v);
  return wrong && nullable ? `${wrong} or null` : wrong;
}

// The args check every script runs first, before any agent() call. `args` arrives verbatim: an
// object, or a JSON string (the untyped-param case council.js tolerates at :263-267), which is parsed.
// `required` and `optional` map each field the script takes to its kind. A required field must be
// present (null only where its kind takes null); an optional one is checked when present; a field in
// neither is refused, since a misspelt optional field would otherwise be dropped in silence. Every
// problem is named in one error, headed by the script's name; the parsed object is returned.
function readsArgs(args, { who, required = {}, optional = {} } = {}) {
  if (typeof who !== "string" || !who.trim()) throw new Error("reads: who is the script's name, which heads every refusal");
  // Every kind is checked before any value, so a misspelt kind fails even while its field is absent.
  for (const kind of [...Object.values(required), ...Object.values(optional)]) {
    if (typeof kind !== "function") readsArgProblem(kind, undefined);
  }
  let a = args;
  if (typeof a === "string") {
    try {
      a = JSON.parse(a);
    } catch (e) {
      throw new Error(`${who}: args arrived as text that is no JSON (${e.message}); pass the args object`);
    }
  }
  const takes = [...Object.keys(required), ...Object.keys(optional)];
  if (a === undefined || a === null) throw new Error(`${who}: no args; it needs ${Object.keys(required).join(", ") || "an args object"}`);
  if (typeof a !== "object" || Array.isArray(a)) throw new Error(`${who}: args is an object; got ${Array.isArray(a) ? "a list" : typeof a}`);
  const problems = [];
  // A kind word reads "args.x is <what it must be>"; a function's answer is its own sentence.
  const wrongOf = (k, kind) => {
    const wrong = readsArgProblem(kind, a[k]);
    if (wrong) problems.push(typeof kind === "function" ? `args.${k}: ${wrong}` : `args.${k} is ${wrong}`);
  };
  for (const [k, kind] of Object.entries(required)) {
    if (!Object.hasOwn(a, k) || a[k] === undefined) problems.push(`args.${k} is required`);
    else wrongOf(k, kind);
  }
  for (const [k, kind] of Object.entries(optional)) {
    if (Object.hasOwn(required, k)) throw new Error(`reads: ${k} is both required and optional`);
    if (Object.hasOwn(a, k) && a[k] !== undefined) wrongOf(k, kind);
  }
  for (const k of Object.keys(a)) if (!takes.includes(k)) problems.push(`args.${k} is no field this script takes (it takes: ${takes.join(", ")})`);
  if (problems.length) throw new Error(`${who}: ${problems.join("; ")}`);
  return a;
}
// ---------------------------------------------------------------- end of lib/reads.mjs

// THE CHECK WORKFLOW (KTD6, KTD7, KTD8, KTD9 and U5 of docs/plans/hybrid-plan-step-plan.md).
//   Round 1 builds its roster from args: coherence, feasibility, scope-guardian and the adversary
//   always (the single adversary, or the high-risk panel's four angles when the scorer's recorded
//   profile is high-risk), the lenses the main loop picked (product, security, design), and our four
//   seats (premise, reach, blast-radius, test-vacuity), reach and test-vacuity skipped together with
//   their logged reason on a plan with no code (KTD6).
//   Rounds 2 and 3 run exactly the seats args name (flow.mjs roundSeats: coherence and every seat a
//   change touched) with the fold's changes, each { id, kind, classes, text } and an edit with its
//   was, which the main loop builds from the record (R4-25, R4-28).
// Every seat gets the same roster, in one order. Each read is checked against KTD7 and re-run once
// inside this run when short; a second short read keeps the seat's findings and is a coverage hole
// naming the sections it never confirmed. A dead seat is a coverage hole, never "no findings". Each
// seat's findings go to severity-scaled verifiers as soon as it returns (3 for a P0 or P1, 2 for a
// P2, 1 for a P3), the verdict kept beside the raw votes (KTD24).
// What counts as an open P0 or P1 is the voted severity, failing closed: a confirmed finding counts
// when its real-voters put it at P0 or P1, or split on that line (severityLine "above" or "both"); a
// claimed P0 or P1 they put lower does not. The claimed count comes back beside it.
//
// Args (refused, naming each problem, before any helper starts):
//   plan, project, request, brief, update, lands, goalMoves, claudeMd, contractBrief, ce, index,
//   lastLine            as the deepen takes them
//   round               1, 2 or 3
//   highRisk, lenses, noCode   round 1 only: the scorer's recorded high-risk flag, the lens picks
//                       (each product, security or design), and null or the reason the plan has no code
//   seats, changes      rounds 2 and 3 only: the seats to run and the fold's changes
//   dry                 optional: one helper per phase (the first seat, one verifier), no re-run
// Every helper runs on Opus at xhigh (KTD13). The return leads with its summary (KTD12).

const CHECK_LENSES = ['product', 'security', 'design']
const CHECK_PANEL = ['adv-sequencing', 'adv-settled', 'adv-hidden-work', 'adv-verification']
const CHECK_CLASSES = ['premise', 'reach', 'blast-radius', 'test-vacuity']
const CHECK_SKIPPABLE = ['reach', 'test-vacuity']
const CHECK_SEATS = [...Object.keys(PROMPT_CHECK_SEATS), 'premise']

const textList = (v) => (Array.isArray(v) && v.every((m) => typeof m === 'string' && m.trim()) ? null : 'a list of non-empty text (an empty list when none)')
const changeList = (v) => (Array.isArray(v) && v.length > 0 && v.every((c) => c && typeof c === 'object' && typeof c.id === 'string' && c.id.trim() && ['edit', 'add', 'delete'].includes(c.kind) && Array.isArray(c.classes) && typeof c.text === 'string' && c.text.trim() && (c.kind === 'edit' ? typeof c.was === 'string' && c.was.trim() : c.was === undefined))
  ? null
  : "the fold's changes, a non-empty list of { id, kind, classes, text }, an edit with its was (the text it replaced), no other kind with one")
const A = readsArgs(args, {
  who: 'check',
  required: {
    plan: 'path',
    project: 'path',
    request: 'text',
    brief: 'path?',
    update: 'bool',
    claudeMd: (v) => (Array.isArray(v) && v.every(readsIsPath) ? null : "the project's CLAUDE.md paths, a list of absolute paths (an empty list when it has none)"),
    contractBrief: 'text',
    ce: readsCeProblem,
    index: readsIndexProblem,
    lastLine: readsLastProblem,
    round: (v) => ([1, 2, 3].includes(v) ? null : 'the check round, 1, 2 or 3'),
  },
  optional: {
    lands: 'path',
    goalMoves: textList,
    highRisk: 'bool',
    lenses: (v) => (Array.isArray(v) && v.every((l) => CHECK_LENSES.includes(l)) && new Set(v).size === v.length ? null : `the lens picks, each one of ${CHECK_LENSES.join(', ')}, none twice`),
    noCode: 'text?',
    seats: (v) => (Array.isArray(v) && v.length > 0 && v.every((s) => CHECK_SEATS.includes(s)) && new Set(v).size === v.length ? null : `the seats this round runs, each one of ${CHECK_SEATS.join(', ')}, none twice`),
    changes: changeList,
    dry: 'bool',
  },
})
const crossed = []
if (A.update) {
  if (A.lands === undefined) crossed.push("args.lands is required on an update run (the plan's named path)")
  if (A.goalMoves === undefined) crossed.push('args.goalMoves is required on an update run (an empty list when none)')
} else {
  if (A.brief === null) crossed.push('args.brief is null only on an update run')
  if (A.lands !== undefined) crossed.push('args.lands is for an update run only')
  if (A.goalMoves !== undefined && A.goalMoves.length) crossed.push('args.goalMoves is for an update run only')
}
if (A.round === 1) {
  for (const k of ['highRisk', 'lenses', 'noCode']) if (A[k] === undefined) crossed.push(`args.${k} is required in round 1`)
  for (const k of ['seats', 'changes']) if (A[k] !== undefined) crossed.push(`args.${k} is for rounds 2 and 3 only`)
} else {
  for (const k of ['seats', 'changes']) if (A[k] === undefined) crossed.push(`args.${k} is required in round ${A.round}`)
  for (const k of ['highRisk', 'lenses', 'noCode']) if (A[k] !== undefined) crossed.push(`args.${k} is for round 1 only`)
  if (A.seats !== undefined && !A.seats.includes('coherence')) crossed.push('args.seats has no coherence seat, which every round re-runs (KTD9)')
  if (A.seats !== undefined && A.seats.includes('adversarial') && A.seats.some((s) => CHECK_PANEL.includes(s))) crossed.push('args.seats runs the single adversary and the panel together (KTD6)')
}
if (crossed.length) throw new Error(`check: ${crossed.join('; ')}`)
readsSections(A.index, A.lastLine.line)

const DRY = A.dry === true
const ctx = {
  plan: A.plan, project: A.project, request: A.request, brief: A.brief, update: A.update,
  claudeMd: A.claudeMd, contractBrief: A.contractBrief, laws: SIZE_LAWS, lastLine: A.lastLine,
  ...(A.update ? { lands: A.lands, goalMoves: A.goalMoves } : {}),
}
const GATE = { last: A.lastLine, index: A.index, page: PROMPT_PAGE, floor: PROMPT_QUOTE_FLOOR }
const range = (n) => Array.from({ length: n }, (_, i) => i)
const sectionsNamed = (list) => list.map((s) => `"${s.heading}" (line ${s.line})`).join(', ')
const call = (built, label, phaseName) =>
  agent(built.prompt, { label, phase: phaseName, schema: SCHEMAS[built.schema], model: 'opus', effort: 'xhigh' })

// The roster: round 1's built from the flags, a later round's exactly as args name it.
const skipped = []
let roster
if (A.round === 1) {
  if (A.noCode !== null) for (const s of CHECK_SKIPPABLE) skipped.push({ seat: s, reason: A.noCode.trim() })
  roster = [
    'coherence', 'feasibility', 'scope-guardian',
    ...(A.highRisk ? CHECK_PANEL : ['adversarial']),
    ...CHECK_LENSES.filter((l) => A.lenses.includes(l)),
    'premise',
    ...['reach', 'blast-radius', 'test-vacuity'].filter((s) => A.noCode === null || !CHECK_SKIPPABLE.includes(s)),
  ]
} else {
  roster = [...A.seats]
}
// A later round's changes as the seats read them: { kind, text }, an edit with its was.
const changes = A.round === 1 ? [] : A.changes.map((c) => (c.kind === 'edit' ? { kind: c.kind, text: c.text, was: c.was } : { kind: c.kind, text: c.text }))

// Every seat's prompt is built before the first helper starts.
const running = DRY ? roster.slice(0, 1) : roster
const seats = running.map((seat) => ({
  seat,
  built: seat === 'premise'
    ? promptPremise(ctx, { mode: 'check', roster, round: A.round, changes })
    : promptCheckSeat(ctx, { seat, ...(PROMPT_CHECK_SEATS[seat].ce === null ? {} : { persona: readsCeFile(A.ce, PROMPT_CHECK_SEATS[seat].ce) }), roster, round: A.round, changes }),
}))

// One seat's read, with its one re-run: { answer, hole, reran }.
async function seatRead(s) {
  const first = await call(s.built, `check:${s.seat}`, 'Check')
  if (first === null) return { answer: null, hole: { seat: s.seat, missed: `its class in round ${A.round}: the seat never answered` }, reran: false }
  const c1 = readsInventory(first, { ...GATE, endsAt: s.built.endsAt })
  if (c1.ok) return { answer: first, hole: null, reran: false }
  if (DRY) return { answer: first, hole: { seat: s.seat, missed: `the sections it never confirmed reading (a dry run re-runs nothing): ${sectionsNamed(c1.missed)}` }, reran: false }
  const again = await call(promptShortRead(s.built, readsRerun(c1)), `check:${s.seat} (re-run)`, 'Check')
  const c2 = again === null ? null : readsInventory(again, { ...GATE, endsAt: s.built.endsAt })
  if (c2 && c2.ok) return { answer: again, hole: null, reran: true }
  return { answer: again ?? first, hole: { seat: s.seat, missed: `the sections it never confirmed reading, after its re-run${again === null ? ' died' : ' read short again'}: ${sectionsNamed((c2 ?? c1).missed)}` }, reran: true }
}

phase('Check')
log(`check round ${A.round}: ${running.length} seat${running.length === 1 ? '' : 's'} (${running.join(', ')})${DRY ? ' (dry: one helper per phase)' : ''}`)
let verifiersLeft = DRY ? 1 : Infinity
const done = await pipeline(
  seats,
  async (s) => ({ s, read: await seatRead(s) }),
  async ({ s, read }) => {
    const found = read.answer?.findings ?? []
    const list = DRY ? found.slice(0, verifiersLeft > 0 ? 1 : 0) : found
    if (DRY) verifiersLeft -= list.length
    const checked = await parallel(list.map((f, i) => async () => {
      const n = DRY ? 1 : refuterCount(f.severity)
      const builts = range(n).map((angle) => promptVerifier(ctx, { item: f, kind: 'finding', angle }))
      const votes = await parallel(builts.map((b, angle) => () => call(b, `check:verify ${s.seat}-${i + 1} angle ${angle + 1}`, 'Verify')))
      return { id: `${s.seat}-${i + 1}`, seat: s.seat, finding: f, verdict: judge(votes, f.severity), votes, line: severityLine(votes.filter(Boolean).filter((v) => v.real)) }
    }))
    if (checked.some((x) => x === null)) throw new Error('check: a script error in the Verify phase')
    return { s, read, checked }
  },
)
// The reads handle a dead helper themselves, so a null here is this script's own error, which the
// runtime would otherwise pass off as a dead helper.
if (done.some((x) => x === null)) throw new Error('check: a script error in the Check or Verify phase (the runtime hid it as a null)')

const holes = []
const findings = []
const perSeat = []
for (const { s, read, checked } of done) {
  if (read.hole) holes.push(read.hole)
  findings.push(...checked)
  perSeat.push({ seat: s.seat, answered: read.answer !== null, reran: read.reran, findings: checked.length, overflow: read.answer?.overflow ?? [], residual: read.answer?.residual_risks ?? [] })
}
const idsOf = (status) => findings.filter((f) => f.verdict.status === status).map((f) => f.id)
const confirmed = findings.filter((f) => f.verdict.status === 'confirmed')
const high = (sev) => sev === 'P0' || sev === 'P1'
const advSeats = roster.filter((s) => s === 'adversarial' || CHECK_PANEL.includes(s))
const advDead = advSeats.filter((s) => !perSeat.some((p) => p.seat === s && p.answered))
// Our four classes in the receipt's forms (flow.mjs coverageOf) for this round: a class whose seat
// did not run this round is left out.
const classes = {}
for (const c of CHECK_CLASSES) {
  const sk = skipped.find((x) => x.seat === c)
  if (sk) classes[c] = { skipped: sk.reason }
  else if (!running.includes(c)) continue
  else if (holes.some((h) => h.seat === c)) classes[c] = { hole: true }
  else {
    const ids = confirmed.filter((f) => f.seat === c).map((f) => f.id)
    classes[c] = ids.length ? { verified: ids } : { nothing: true }
  }
}
const premiseSeat = done.find((d) => d.s.seat === 'premise')
return {
  summary: {
    stage: `check-${A.round}`,
    round: A.round,
    dry: DRY,
    roster,
    ran: running,
    skipped,
    // The adversary ran only when every adversary seat in the roster answered; null when none is in
    // this round's roster.
    adversary: advSeats.length ? { ran: advDead.length === 0, absent: advDead } : null,
    findings: findings.length,
    confirmed: idsOf('confirmed'),
    handVerify: idsOf('hand-verify'),
    advisory: idsOf('advisory'),
    rejected: idsOf('rejected'),
    p0p1: confirmed.filter((f) => f.line === 'above' || f.line === 'both').length,
    p0p1Claimed: confirmed.filter((f) => high(f.finding.severity)).length,
    classes,
    // On an update, read fail-closed (R4-30): a goal the premise seat left unjudged, or a premise seat
    // that never answered, is false; null when no premise seat ran or the plan is new.
    goalJudged: A.update && premiseSeat ? premiseSeat.read.answer?.goal_judged === true : null,
    holes,
  },
  seats: perSeat,
  findings,
}
