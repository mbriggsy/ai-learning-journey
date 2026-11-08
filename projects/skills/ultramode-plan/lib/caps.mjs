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
export const SIZE = {
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
export const PAYLOAD = 6000;

// The schema-side value of an entry, and the prompt-side value.
export function capOf(key) {
  const e = SIZE[key];
  if (!e) throw new Error(`caps: no size entry "${key}"`);
  if (e.chars !== undefined) return Math.ceil((e.chars * 5) / 4);
  if (e.items !== undefined) return e.items;
  return e.max;
}
export function budgetOf(key) {
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
export const SECTION_KINDS = [
  "requirements", "context-research", "key-decisions", "open-questions", "design", "units", "system-impact", "risks", "docs-ops",
  "goal-problem", "assumptions", "verification", "done",
  "other",
];
// CE's seven high-risk signals (final-review.md 5.3.1). A plan with any of them is high-risk.
export const RISK_SIGNALS = ["security", "payments", "data-migration", "external-api", "privacy", "parity", "rollout"];
export const PLAN_DEPTHS = ["Lightweight", "Standard", "Deep"];

const CAPS_INVENTORY = {
  last_line_number: capWhole("line"),
  last_line_text: capString("lastLineText"),
  pages_read: capWhole("pages"),
};

// Every schema puts its required fields first, so a call cut after its first property still
// carries one and fails loud on content, not on a missing property (insight 084).
export const SCHEMAS = {
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
export const SIZE_LAWS = {
  finder: `${CAPS_LAW} certifies nothing. At most ${budgetOf("findings")} findings (fewer and deeper beats many and shallow; name further concrete ones in overflow: at most ${budgetOf("overflow")} titles of at most ${budgetOf("overflowItem")} characters). Per finding: title at most ${budgetOf("title")} characters, section ${budgetOf("section")}, why_it_matters ${budgetOf("why")}, suggested_fix ${budgetOf("fix")}. At most ${budgetOf("residual")} residual_risks of at most ${budgetOf("residualItem")} characters. ${CAPS_INVENTORY_LAW}. ${CAPS_LAW_END}`,
  verdict: `${CAPS_LAW} turns your vote into an abstention. reasoning at most ${budgetOf("reasoning")} characters, citing file:line or the plan's line; better_fix at most ${budgetOf("betterFix")} characters, or '' when the proposed change is right. ${CAPS_LAW_END}`,
  scorer: `${CAPS_LAW} stops the deepen as blocked. At most ${budgetOf("sections")} sections, each named in at most ${budgetOf("sectionName")} characters, with the line of the index heading it starts at; at most ${budgetOf("notes")} notes, one per section scoring 2 points or more (past ${budgetOf("notes")}, the ${budgetOf("notes")} that rank highest), each with its row's line and naming its triggers in at most ${budgetOf("triggersNamed")} characters. ${CAPS_INVENTORY_LAW}. ${CAPS_LAW_END}`,
  amendment: `${CAPS_LAW} proposes nothing. At most ${budgetOf("amendments")} amendments (name further ones in overflow: at most ${budgetOf("overflow")} titles of at most ${budgetOf("overflowItem")} characters). Per amendment: section at most ${budgetOf("section")} characters, gap ${budgetOf("gap")} (the gap it closes, with its plan line), change ${budgetOf("change")}, evidence ${budgetOf("evidence")}, at most ${budgetOf("oldValues")} old_values of at most ${budgetOf("oldValue")} characters each. outside_ran: an external researcher's only, true when a web search ran and every page cited as read was fetched. ${CAPS_LAW_END}`,
  gist: `${CAPS_LAW} returns nothing. gist at most ${budgetOf("gist")} characters; dossier is the dossier's absolute path, at most ${budgetOf("dossier")} characters. ${CAPS_LAW_END}`,
};

// Every problem that would let a schema carry an unbounded call, or put a required field after
// an optional one. An empty list means the schema is capped.
export function schemaProblems(schema, at = "root") {
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
export function maximalOf(schema) {
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
export function maxPayload(schema) {
  const problems = schemaProblems(schema);
  if (problems.length) throw new Error(`caps: an uncapped schema cannot be sized: ${problems.join("; ")}`);
  return JSON.stringify(maximalOf(schema)).length;
}
