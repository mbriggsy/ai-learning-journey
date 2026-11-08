// THE PROMPT BUILDERS (U4 of docs/plans/hybrid-plan-step-plan.md). Every prompt the run sends a
// helper is built here, by tested code, so each seat's charter has one home and cannot drift
// between copies (KTD1). Each builder returns { prompt, schema }: the prompt text, and the key of
// the caps.mjs schema the helper's StructuredOutput call must match (null for a helper that answers
// in plain text). The size-law line a prompt states and the schema a script passes therefore come
// from one choice, made here.
//
// What the prompts carry (R3, R6, KTD7, KTD22):
//   - every prompt: never WebFetch; never ask the user; no file written, but a research helper's
//     one dossier; absolute paths and a path on every Grep and Glob; read-only commands only;
//   - every prompt after the contract brief exists: the project's CLAUDE.md paths to read first,
//     the contract brief verbatim, and the request with the brief (ctx.request, ctx.brief: an
//     update run may have no brief, and then the goal is judged against the request alone);
//   - every whole-plan reader (each check seat, the premise seat, the scorer): the paging rule and
//     the reading inventory, the plan's last line given by its number only (its text is what
//     KTD7's check compares, so a prompt that quoted it would hand a short reader the answer);
//   - every check seat, the premise seat and every verifier on an update run: the named path
//     (ctx.lands) holds the plan's own earlier version, never a stale doc;
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
export const PROMPT_CHECK_SEATS = {
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
export const PROMPT_OWNS = { ...Object.fromEntries(Object.entries(PROMPT_CHECK_SEATS).map(([k, s]) => [k, s.owns])), premise: PROMPT_PREMISE_OWNS };

// The single adversary's angles. The panel's four angles together carry every one (tested), so
// running the panel in its place drops none.
export const PROMPT_ANGLE_LIST = ["sequencing and dependencies", "a decision, settled or not, that cannot reach its outcome", "hidden work", "verification gaps", "any assumption the plan never checks"];

// The research and deepen helpers' agent files (KTD4, KTD5 step 3), by their CE file stems: the
// same thirteen resolve-ce.mjs lists (tested).
export const PROMPT_AGENTS = [
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
export const PROMPT_REFUTER_ANGLES = [
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
// of it (the 153 KB pay-check spec came back as lines 1 to 269 of 1,059).
const PROMPT_PAGE = 160;
// The inventory quotes the first 120 characters of the last line (caps.mjs lastLineText, tested).
export const PROMPT_QUOTE = 120;

// ---------------------------------------------------------------- filling and checking

// Fills every {slot} in one pass, through a replacement function (a replacement string would read
// "$&", "$'" and "$$" in a slot's value as patterns). A slot with no value, or an empty one, throws
// naming it; a value is never scanned again, so braces inside it stay as they are.
export function promptFill(template, slots) {
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

const PROMPT_FINDER_RETURN = "RETURN ONLY the structured object. Each finding names the plan section it is about (its heading) and the plan line it rests on, and carries its evidence in why_it_matters: the plan's words, and the file:line in the repo or the doc that contradicts or confirms them. suggested_fix is the change to the plan that closes it. Suppress a finding you cannot honestly anchor at confidence 50; a 50 survives only as P0 or as a residual risk, and an actionable finding needs 75. Severity: P0, building from the plan as written gives the wrong thing on every path, or the plan cannot reach its goal; P1, a wrong decision, a missing or wrong unit, or a verification that passes on wrong code, on a path the build takes; P2, a real gap on a narrow path, or a section too weak for its job; P3, minor. An empty findings list is an honest answer when your class holds nothing.";

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
// added, edited or removed (a deletion leaves no sentence in the plan, so its old text is shown).
// Round 2 admits a P0 or P1 found anywhere; round 3 checks one fix alone.
const PROMPT_CHANGE_LABELS = { edit: "edited", add: "added", delete: "removed" };
const PROMPT_ROUND = [
  "THIS IS CHECK ROUND {round}. The plan changed since the last round; these are the changes the fold made, each with the text it added, edited or removed:",
  "{changes}",
  "Read the whole plan again. Judge first whether each change is right and whether it opened a seam with any other section; a finding the last round reported and the fold closed is not new. Report a P0 or P1 wherever you find it in the plan; report a P2 or P3 only where a change causes it or touches it, and put any other in residual_risks.",
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
// seat's, a verifier's, the scorer's goal checklist) is judged against them. An update run starts at
// the deepen (flow.mjs firstStage), so it may have no brief (ctx.brief null); a new plan always has
// one. With none, the goal is judged against the request and any origin document the plan cites,
// never the plan's own Goal Capsule, which under an update is the committed plan judging itself.
function promptRequestBlock(ctx) {
  const request = promptText(ctx?.request, "ctx.request (what was asked for)");
  if (typeof ctx.update !== "boolean") throw new Error("prompts: ctx.update says whether this run updates a committed plan (true or false)");
  if (ctx.brief === null) {
    if (!ctx.update) throw new Error("prompts: ctx.brief is the brief's path; only an update run may have none (null)");
    return promptFill("THE REQUEST (what was asked for):\n{request}\nTHE BRIEF: none. This run updates a plan already committed and was given no brief, so judge the goal against the request and any origin document the plan cites, never against the plan's own Goal Capsule: under an update, the plan is the committed one, so that would be circular.", { request });
  }
  return promptFill("THE REQUEST (what was asked for):\n{request}\nTHE BRIEF it was planned from: {brief} (read it).", { request, brief: promptPath(ctx.brief, "ctx.brief (the brief's path, or null on an update run given none)") });
}

// On an update run the named path holds HEAD's earlier version of the plan under review, which the
// landing replaces: a seat that reads the repo must not take it for a stale doc. Nothing on a new plan.
function promptUpdateBlock(ctx) {
  if (ctx?.update !== true) return null;
  return promptFill("THIS RUN UPDATES A COMMITTED PLAN: {lands} holds HEAD's earlier version of this plan, which the landing replaces. It is never a stale doc, a counterexample or a target for the plan's docs unit.", { lands: promptPath(ctx.lands, "ctx.lands (the plan's named path, which an update run's landing replaces)") });
}

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
// { kind: "edit" | "add" | "delete", text }: null for round 1, else the round block.
function promptRoundBlock(round, changes) {
  if (![1, 2, 3].includes(round)) throw new Error(`prompts: round is 1, 2 or 3; got ${JSON.stringify(round)}`);
  if (round === 1) {
    if (Array.isArray(changes) && changes.length) throw new Error("prompts: check round 1 has no changes to name");
    return null;
  }
  if (!Array.isArray(changes) || changes.length === 0) throw new Error(`prompts: check round ${round} needs the changes the fold made (changes)`);
  for (const c of changes) {
    if (!c || typeof c !== "object" || !Object.hasOwn(PROMPT_CHANGE_LABELS, c.kind) || typeof c.text !== "string" || !c.text.trim()) throw new Error(`prompts: a change is { kind: "edit" | "add" | "delete", text } (flow.mjs's change kinds); got ${JSON.stringify(c)}`);
  }
  // A change's own line breaks are indented, so a multi-line change never reads as a second bullet.
  const lines = changes.map((c) => `- ${PROMPT_CHANGE_LABELS[c.kind]}: ${c.text.trim().split(/\r?\n/).join("\n  ")}`).join("\n");
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
// and fit, and the web tool named (CE's web-researcher.md stops when it finds none).
const promptOutsideFirst = (focus) => promptFill("outside sources first, on this focus: {focus}. Use the repo only to read the versions in use or to check how an outside answer fits it. ", { focus: focus.replace(/[.\s]+$/, "") }) + PROMPT_WEB_TOOL;

// A research or deepen helper's agent file, with CE's optional scope prefix (deepening-workflow.md's
// "Scope: architecture, patterns"), or, when the file is missing, its own method.
function promptAgentBlock(agent, file, scope, wins) {
  const scoped = scope === null ? null : promptText(scope, "scope");
  if (file) return promptFill("YOUR AGENT FILE: {file}", { file }) + (scoped ? ` (Scope: ${scoped})` : "") + promptFill("\nRead it first: it is your research method. Where it conflicts with this prompt, this prompt wins: {wins}.", { wins });
  return promptFill("CE's agent file for {agent} is missing in this run, so research by your own method", { agent }) + (scoped ? `, scoped to ${scoped}` : "") + " (the receipt names this seat as run without its file).";
}

// ---------------------------------------------------------------- the contract brief (KTD22)

// The one Agent-tool helper the main loop runs before the run's first Workflow. It answers in plain
// text, 10 to 20 lines, which the run records verbatim and passes to every later helper.
export function promptContractBrief({ planPath, project, claudeMd, insights, request } = {}) {
  const prompt = promptJoin([
    promptFill("You write the contract brief for an unattended planning run. The plan will be written at {plan_path}, in the project at {project}.\nTHE REQUEST:\n{request}", {
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
export function promptResearch(ctx, { agent, agentFile, scope = null, dossier, learnings = null, focus = null } = {}) {
  if (!PROMPT_AGENTS.includes(agent)) throw new Error(`prompts: ${JSON.stringify(agent)} is not a research agent (one of: ${PROMPT_AGENTS.join(", ")})`);
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
export function promptPremise(ctx, { mode, roster, round = 1, changes = [] } = {}) {
  if (mode !== "deepen" && mode !== "check") throw new Error(`prompts: mode is "deepen" or "check" (the premise seat runs in both); got ${JSON.stringify(mode)}`);
  const check = mode === "check";
  if (!check && (roster !== undefined || round !== 1 || (Array.isArray(changes) && changes.length))) throw new Error("prompts: the deepen's premise seat runs beside the scorer, with no roster and no round");
  const running = check ? promptRoster(roster, "premise") : null;
  const roundBlock = check ? promptRoundBlock(round, changes) : null;
  const asked = promptRequestBlock(ctx);
  const prompt = promptJoin([
    promptFill("You are the premise seat in the {mode} of a plan: {plan}. The plan has not been built; you judge whether its premise holds, against the repo it will change ({project}) and the request it answers.", {
      mode,
      plan: promptPath(ctx?.plan, "ctx.plan"),
      project: promptPath(ctx?.project, "ctx.project"),
    }),
    asked,
    promptUpdateBlock(ctx),
    [
      "YOUR CHARTER, all four parts:",
      "1. THE INCIDENT: for every guard, gate, check or safety mechanism the plan adds, the incident it answers: a commit, a transcript or a measured case, cited. A guard against something that has never happened to this project is a finding, unless the plan shows why it will.",
      "2. THE POPULATION: for every feature, an instance of the population it serves that exists in today's code (a caller, a file, a flow, a user's case), cited by file:line. A feature with no such instance is a finding.",
      `3. THE GOAL: is the plan's goal the one asked for in the request${ctx.brief === null ? "" : " and the brief"}? A goal narrowed, widened or replaced without saying so is a finding.`,
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
    promptLaw(ctx, "finder"),
  ]);
  return { prompt, schema: "finder" };
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

const PROMPT_OUR_CHECKLISTS = [
  "OUR FOUR CHECKLISTS (CE never scores these sections; score them like CE's):",
  "Goal Capsule and Problem Frame (kind goal-problem):",
  "- The goal is not the one the request or brief asked for, or narrows, widens or replaces it without saying so.",
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
export function promptScorer(ctx, { deepening, finalReview, index, deepened } = {}) {
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
  const prompt = promptJoin([
    promptFill("You are the scorer in the deepen of a plan: {plan}. You score every section of the plan for confidence gaps, so the run can pick the sections a research pass strengthens (KTD5). You change nothing.", { plan: promptPath(ctx?.plan, "ctx.plan") }),
    promptRequestBlock(ctx),
    method,
    dw || fr ? PROMPT_LENS_RULE : null,
    PROMPT_OUR_CHECKLISTS,
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
  return { prompt, schema: "scorer" };
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
export function promptAmendment(ctx, { agent, agentFile, scope = null, line, index, triggers, depth, risk, learnings = null, focus = null } = {}) {
  if (!PROMPT_AGENTS.includes(agent)) throw new Error(`prompts: ${JSON.stringify(agent)} is not a deepen agent (one of: ${PROMPT_AGENTS.join(", ")})`);
  const file = promptPathOrNull(agentFile, "agentFile");
  if (!Array.isArray(risk) || risk.some((r) => !Object.hasOwn(PROMPT_RISKS, r))) throw new Error(`prompts: risk is the list of the plan's risk signals (each one of: ${Object.keys(PROMPT_RISKS).join(", ")})`);
  const where = promptLearningsBlock(agent, learnings);
  const outside = promptFocus(agent, focus);
  const last = promptLastLine(ctx);
  const span = promptSpan(promptIndex(index), line, last.line);
  const job = outside
    ? `YOUR JOB: research what would close each problem in ${promptOutsideFirst(outside)} When outside research cannot run (no web tool answers), put "outside research could not run" in overflow and propose only what the repo supports.`
    : "YOUR JOB: research what would close each problem, grounded in this repo first (its code, its docs, its CLAUDE.md files and its docs/insights/) and in outside sources only where the repo cannot answer.";
  const prompt = promptJoin([
    promptFill("You strengthen one section of a plan in its deepen: {plan}. The repo it will change: {project}.", { plan: promptPath(ctx?.plan, "ctx.plan"), project: promptPath(ctx?.project, "ctx.project") }),
    promptAgentBlock(agent, file, scope, "your return is this prompt's structured object, not the agent file's format, and you write no file"),
    file ? PROMPT_LENS_RULE : null,
    promptRequestBlock(ctx),
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
export function promptVerifier(ctx, { item, kind, angle, line, index, triggers } = {}) {
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
        ? "- corrected_severity: P0 to P3, by what the plan and the source show; 'drop' when it should not stand."
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

// One check seat (KTD6). `persona` is the seat's CE persona file (null when missing, and always
// null for our three seats); `roster` the seats running, the premise seat among them when it runs
// (promptPremise builds it); `round` 1, 2 or 3, with `changes` (the fold's changes, each
// { kind, text }) after round 1 (KTD9).
export function promptCheckSeat(ctx, { seat, persona = null, roster, round = 1, changes = [] } = {}) {
  if (seat === "premise") throw new Error("prompts: the check's premise seat is built by promptPremise in check mode");
  if (!Object.hasOwn(PROMPT_CHECK_SEATS, seat)) throw new Error(`prompts: ${JSON.stringify(seat)} is no check seat (one of: ${Object.keys(PROMPT_CHECK_SEATS).join(", ")})`);
  const s = PROMPT_CHECK_SEATS[seat];
  const file = promptPathOrNull(persona, "persona");
  if (s.ce === null && file !== null) throw new Error(`prompts: ${seat} reads no CE file, so it takes no persona`);
  const running = promptRoster(roster, seat);
  const roundBlock = promptRoundBlock(round, changes);
  const prompt = promptJoin([
    promptFill("You are the {seat} seat in the check of a plan: {plan}. The plan has not been built; you review the plan itself, against the repo it will change ({project}).\nYOUR LENS: {role}", {
      seat,
      plan: promptPath(ctx?.plan, "ctx.plan"),
      project: promptPath(ctx?.project, "ctx.project"),
      role: s.role,
    }),
    promptRequestBlock(ctx),
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
  return { prompt, schema: "finder" };
}

// ---------------------------------------------------------------- the re-run of a short reader (KTD7)

// A whole-plan reader whose inventory stopped short is re-run once, inside its script, with a
// prompt naming what it missed (a resume would replay its cached short read). `missed` lists the
// sections it never reached, each { line, heading }; `stoppedAt` the last line it quoted.
export function promptShortRead(built, { missed, stoppedAt } = {}) {
  if (!built || typeof built.prompt !== "string" || (built.schema !== "finder" && built.schema !== "scorer")) throw new Error("prompts: a short read re-runs a whole-plan reader's built prompt (a finder or the scorer)");
  if (!Number.isInteger(stoppedAt) || stoppedAt < 0) throw new Error("prompts: stoppedAt is the last line the short read reached (0 when it quoted none)");
  if (!Array.isArray(missed) || missed.length === 0) throw new Error("prompts: a short read names the sections it missed");
  for (const m of missed) if (!m || !Number.isInteger(m.line) || typeof m.heading !== "string" || !m.heading.trim()) throw new Error(`prompts: a missed section is { line, heading }; got ${JSON.stringify(m)}`);
  const head = promptFill("YOUR LAST READ OF THIS PLAN STOPPED SHORT at line {stopped}, so these sections went unread:\n{missed}\nThis is your one re-run: read the plan to its last line, these sections included, before you return.", {
    stopped: String(stoppedAt),
    missed: missed.map((m) => `- line ${m.line}: ${m.heading.trim()}`).join("\n"),
  });
  return { prompt: promptJoin([head, built.prompt]), schema: built.schema };
}

// ---------------------------------------------------------------- the lens picks (KTD6)

// The main loop's own read of CE's persona-selection.md (null when missing: the signals come inline,
// read in CE 3.37.0). It picks the conditional lenses only; the four always-on seats always run, and
// depth.md's lite review never does. depth.md's rule for judging activation (from what the plan's
// named code paths touch) is stated here, in both branches, since its lite-or-full choice is not ours.
export function promptLensPicks({ plan, personaSelection } = {}) {
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
