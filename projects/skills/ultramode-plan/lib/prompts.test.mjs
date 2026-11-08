import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROMPT_AGENTS, PROMPT_CHECK_SEATS, PROMPT_REFUTER_ANGLES, promptAmendment, promptCheckSeat, promptContractBrief, promptFill,
  promptLensPicks, promptPremise, promptResearch, promptScorer, promptShortRead, promptVerifier,
} from "./prompts.mjs";
import { CRITICAL_KINDS } from "./select.mjs";
import { RISK_SIGNALS, SCHEMAS, SECTION_KINDS, SIZE_LAWS } from "./caps.mjs";
import { CE_FILES, KNOWN_SEATS, PANEL, SEATS_WITHOUT_CE, fileOf, resolveCe } from "./resolve-ce.mjs";
import { SHA_NEW, ceEntry, ceInstall, registryAt } from "./fixtures/ce-fixture.mjs";
import { tmpRoot } from "../bench/testkit.mjs";

// A run's context as the main loop passes it, every value distinct, so a test can find each one.
const CTX = {
  plan: "C:/runs/plan-x/20261108T120000Z/plan.md",
  project: "C:/repo/projects/x",
  lastLine: { line: 412, text: "- The receipt names every CE commit with the stages it served, every seat that ran without its file, and the run record's path at the end of it all, quoted." },
  contractBrief: "INVARIANTS: money is integer cents (CLAUDE.md).\nLANDMINES: a fixture date in 2031 (docs/insights/051).",
  claudeMd: ["C:/repo/CLAUDE.md", "C:/repo/projects/x/CLAUDE.md"],
  laws: SIZE_LAWS,
};
const INDEX = [
  { line: 1, level: 1, heading: "Plan X", own: true },
  { line: 12, level: 2, heading: "Requirements", own: true },
  { line: 60, level: 2, heading: "Implementation Units", own: false },
  { line: 61, level: 3, heading: "U1. Parser", own: true },
  { line: 140, level: 3, heading: "U2. Writer", own: true },
  { line: 300, level: 2, heading: "Verification Contract", own: true },
];
const CHECK_SEATS = Object.keys(PROMPT_CHECK_SEATS);
const ALWAYS = ["coherence", "feasibility", "scope-guardian", "adversarial"];
const personaOf = (seat) => (PROMPT_CHECK_SEATS[seat].ce === null ? null : `C:/ce/personas/${seat}.md`);

// Every builder, called once with valid input: [name, built, kind] where kind says what the prompt
// must carry ("reader" a whole-plan reader, "after" a helper that runs after the contract brief,
// "main" the main loop's own instruction, which no helper reads, so it carries no helper rules).
function everyBuilder() {
  const out = [
    ["contract brief", promptContractBrief({ planPath: "C:/repo/projects/x/docs/plans/p.md", project: CTX.project, claudeMd: CTX.claudeMd, insights: "C:/repo/projects/x/docs/insights", request: "add a CSV export" }), []],
    ["research", promptResearch(CTX, { agent: "repo-research-analyst", agentFile: "C:/ce/agents/repo-research-analyst.md", scope: "architecture, patterns", request: "add a CSV export", brief: "C:/runs/brief.md", dossier: "C:/runs/research/repo.md" }), ["after"]],
    ["premise", promptPremise(CTX, { request: "add a CSV export", brief: "C:/runs/brief.md" }), ["after", "reader"]],
    ["scorer", promptScorer(CTX, { deepening: "C:/ce/dw.md", finalReview: "C:/ce/fr.md", index: INDEX, deepened: false }), ["after", "reader"]],
    ["amendment", promptAmendment(CTX, { agent: "architecture-strategist", agentFile: "C:/ce/agents/architecture-strategist.md", line: 60, index: INDEX, triggers: "dependency order unclear", depth: "Standard", risk: ["rollout"] }), ["after"]],
    ["verifier", promptVerifier(CTX, { item: { title: "x" }, kind: "finding", angle: 0 }), ["after"]],
    ["lens picks", promptLensPicks({ plan: CTX.plan, personaSelection: "C:/ce/persona-selection.md" }), ["main"]],
  ];
  for (const seat of CHECK_SEATS) {
    const roster = seat.startsWith("adv-") ? ["coherence", seat] : ["coherence", seat].filter((s, i, a) => a.indexOf(s) === i);
    out.push([`check seat ${seat}`, promptCheckSeat(CTX, { seat, persona: personaOf(seat), roster }), ["after", "reader"]]);
  }
  return out;
}

// The roster table a check seat's prompt carries: the seat keys it lists, in order.
function rosterOf(prompt) {
  const block = prompt.split("THE ROSTER AND OWNERSHIP TABLE:")[1];
  assert.ok(block, "the prompt carries no roster table");
  const lines = block.split("\n\n")[0].split("\n").slice(1);
  return lines.map((l) => l.match(/^- ([a-z-]+): /)?.[1]).filter(Boolean);
}

test("the seat table matches resolve-ce.mjs: every seat known, the panel the same four keys, our seats the ones that read no CE file", () => {
  for (const seat of CHECK_SEATS) {
    assert.ok(KNOWN_SEATS.has(seat), `${seat} is no seat resolve-ce.mjs knows`);
    const ce = PROMPT_CHECK_SEATS[seat].ce;
    if (ce === null) assert.ok(SEATS_WITHOUT_CE.includes(seat), `${seat} reads no CE file but is not in SEATS_WITHOUT_CE`);
    else assert.ok(CE_FILES.find((f) => f.key === ce)?.seats.includes(seat), `CE_FILES' ${ce} entry does not name ${seat} among its seats`);
  }
  assert.deepEqual(CHECK_SEATS.filter((s) => s.startsWith("adv-")), PANEL);
  assert.deepEqual([...CHECK_SEATS.filter((s) => PROMPT_CHECK_SEATS[s].ce === null), "premise"].sort(), [...SEATS_WITHOUT_CE].sort());
  for (const seat of CHECK_SEATS) assert.equal(Boolean(PROMPT_CHECK_SEATS[seat].adversary), seat === "adversarial" || PANEL.includes(seat), `${seat}'s adversary flag`);
  for (const seat of PANEL) assert.ok(PROMPT_CHECK_SEATS[seat].angle, `${seat} has no angle`);
});

test("the agent list is resolve-ce.mjs's agent files, and the kinds, risk signals and critical kinds are caps.mjs's and select.mjs's", () => {
  const agents = CE_FILES.filter((f) => f.file.includes("/agents/")).map((f) => f.key);
  assert.deepEqual([...PROMPT_AGENTS].sort(), [...agents].sort());
  const scorer = promptScorer(CTX, { deepening: null, finalReview: null, index: INDEX, deepened: false }).prompt;
  const kinds = scorer.match(/The kinds: (.*)\.\n/)[1];
  assert.deepEqual([...kinds.matchAll(/(?:^|; )([a-z-]+) \(/g)].map((m) => m[1]), SECTION_KINDS);
  const signals = scorer.match(/by these keys: (.*)\.\n/)[1];
  assert.deepEqual([...signals.matchAll(/(?:^|; )([a-z-]+) \(/g)].map((m) => m[1]), RISK_SIGNALS);
  assert.ok(scorer.includes(`its kind is one of ${CRITICAL_KINDS.join(", ")} in a Standard or Deep plan`), "the scorer's critical kinds differ from select.mjs's");
});

test("every helper builder carries the WebFetch ban and the never-ask line; every later one the contract brief and the CLAUDE.md paths; every whole-plan reader the paging rule", () => {
  for (const [name, built, kinds] of everyBuilder()) {
    const p = built.prompt;
    if (kinds.includes("main")) continue;
    assert.match(p, /never use WebFetch/, `${name}: no WebFetch ban`);
    assert.match(p, /Never ask the user anything/, `${name}: no never-ask line`);
    if (kinds.includes("after")) {
      assert.ok(p.includes(CTX.contractBrief), `${name}: no contract brief`);
      for (const c of CTX.claudeMd) assert.ok(p.includes(c), `${name}: no ${c}`);
    }
    if (kinds.includes("reader")) {
      assert.ok(p.includes(`READ THE WHOLE PLAN: ${CTX.plan}`), `${name}: no paging rule`);
      assert.ok(p.includes(`It ends at line ${CTX.lastLine.line}.`), `${name}: the last line's number is missing`);
      assert.ok(p.includes(`>>>${CTX.lastLine.text.slice(0, 120)}<<<`), `${name}: the last line's first 120 characters are not quoted`);
      assert.ok(!p.includes(CTX.lastLine.text.slice(0, 121)), `${name}: the quote runs past 120 characters`);
      assert.match(p, /pages of at most 160 lines/, `${name}: no page size`);
    }
    if (built.schema !== null) {
      assert.ok(Object.hasOwn(SCHEMAS, built.schema), `${name}: schema ${built.schema} is no caps.mjs schema`);
      assert.ok(p.endsWith(SIZE_LAWS[built.schema]), `${name}: its prompt does not end with ${built.schema}'s size law`);
    }
  }
});

test("a whole-plan reader's schema carries the reading inventory; the others' do not claim it", () => {
  for (const [name, built, kinds] of everyBuilder()) {
    if (built.schema === null) continue;
    const has = Object.hasOwn(SCHEMAS[built.schema].properties, "last_line_number");
    assert.equal(has, kinds.includes("reader"), `${name}: schema ${built.schema} ${has ? "has" : "lacks"} the inventory`);
  }
});

test("with one conditional lens unselected and reach skipped, every seat's roster lists exactly the running seats and names neither skipped seat", () => {
  const roster = [...ALWAYS, "product", "security", "blast-radius", "test-vacuity"];
  for (const seat of roster) {
    const p = promptCheckSeat(CTX, { seat, persona: personaOf(seat), roster }).prompt;
    assert.deepEqual(rosterOf(p), roster, `${seat}'s roster`);
    for (const skipped of ["design", "reach"]) assert.doesNotMatch(p, new RegExp(`^- ${skipped}: `, "m"), `${seat} names ${skipped} as an owner`);
  }
  const panel = ["coherence", "feasibility", "scope-guardian", ...PANEL];
  const p = promptCheckSeat(CTX, { seat: "adv-hidden-work", persona: personaOf("adv-hidden-work"), roster: panel }).prompt;
  assert.deepEqual(rosterOf(p), panel);
  assert.doesNotMatch(p, /^- adversarial: /m);
});

test("the premise prompt carries all four parts of its charter, with the request and the brief", () => {
  const p = promptPremise(CTX, { request: "add a CSV export of the ledger", brief: "C:/runs/brief.md" }).prompt;
  assert.match(p, /1\. THE INCIDENT: for every guard, gate, check or safety mechanism the plan adds, the incident it answers: a commit, a transcript or a measured case/);
  assert.match(p, /2\. THE POPULATION: for every feature, an instance of the population it serves that exists in today's code/);
  assert.match(p, /3\. THE GOAL: is the plan's goal the one asked for in the request and the brief\?/);
  assert.match(p, /4\. NO SUPPRESSION: CE's rule that switches the premise challenge off when a plan has an origin .* never applies here/);
  assert.ok(p.includes("add a CSV export of the ledger"));
  assert.ok(p.includes("The brief it was planned from: C:/runs/brief.md"));
});

test("every check seat carries the never-a-false-positive line for its own class and the settlement rule; every persona seat the lens rule and the plan precedence block", () => {
  for (const seat of CHECK_SEATS) {
    const roster = seat.startsWith("adv-") ? ["coherence", seat] : [...new Set(["coherence", seat])];
    const p = promptCheckSeat(CTX, { seat, persona: personaOf(seat), roster }).prompt;
    assert.ok(p.includes(`YOUR CLASS: ${PROMPT_CHECK_SEATS[seat].owns}. A finding in your class is never a false positive here: CE's false-positive catalog entry for "pre-existing issues the document's work does not reach" does not apply to it`), `${seat}: no false-positive line`);
    assert.match(p, /SETTLED DECISIONS: .*A finding against it stands at full severity when it shows the decision cannot reach its outcome under its own constraints; preferring the alternative it rejected is not a finding\./, `${seat}: no settlement rule`);
    if (PROMPT_CHECK_SEATS[seat].ce !== null) {
      assert.match(p, /THE LENS RULE: a CE file supplies your lens only/, `${seat}: no lens rule`);
      assert.ok(p.includes(`YOUR PERSONA FILE: ${personaOf(seat)}`), `${seat}: no persona path`);
      for (const part of ["1. OUTPUT: this prompt's structured object wins", "2. SCOPE: you read the whole plan, never a section slice, whatever CE's dispatch.md says", "3. MODEL: you run on Opus at xhigh effort, set by this run; CE's dispatch.md model tiers do not apply", "5. OWNERSHIP: the persona's \"another reviewer owns this\" boundaries apply only to the seats in the roster above", "no origin-keyed suppression applies"]) assert.ok(p.includes(part), `${seat}: the precedence block lacks "${part}"`);
    } else {
      assert.doesNotMatch(p, /YOUR PERSONA FILE|THE LENS RULE/, `${seat} reads no CE file but its prompt names one`);
      assert.ok(p.includes(PROMPT_CHECK_SEATS[seat].role), `${seat}: its charter is missing`);
    }
    assert.equal(/ADVERSARY MODE/.test(p), Boolean(PROMPT_CHECK_SEATS[seat].adversary), `${seat}: adversary mode`);
  }
  const single = promptCheckSeat(CTX, { seat: "adversarial", persona: personaOf("adversarial"), roster: ALWAYS }).prompt;
  assert.match(single, /Pick the angles that fit/);
  const angled = promptCheckSeat(CTX, { seat: "adv-sequencing", persona: personaOf("adv-sequencing"), roster: ["coherence", "adv-sequencing"] }).prompt;
  assert.ok(angled.includes(`YOUR ASSIGNED ANGLE, hunt only this seam (the other panelists own the rest): ${PROMPT_CHECK_SEATS["adv-sequencing"].angle}.`));
  assert.doesNotMatch(angled, /Pick the angles that fit/);
});

test("a seat whose persona the resolver fixture reports missing gets its inline role and no persona path", (t) => {
  const root = tmpRoot(t);
  const install = ceInstall(root, "3.37.0", { missing: ["security", "deepening-workflow", "persona-selection", "web-researcher"] });
  const r = resolveCe({ registry: registryAt(root, [ceEntry(install, SHA_NEW, "3.37.0")]) });
  assert.equal(fileOf(r, "security"), null);
  const present = fileOf(r, "coherence").path;
  const roster = [...ALWAYS, "security"];
  const sec = promptCheckSeat(CTX, { seat: "security", persona: fileOf(r, "security")?.path ?? null, roster }).prompt;
  assert.ok(sec.includes(`YOUR LENS: ${PROMPT_CHECK_SEATS.security.role}`));
  assert.match(sec, /CE's persona file for this seat is missing in this run, so the lens above is your whole role/);
  assert.doesNotMatch(sec, /YOUR PERSONA FILE|THE LENS RULE/);
  assert.ok(!sec.includes(install.replace(/\\/g, "/")) && !sec.includes(install), "the missing seat's prompt names the CE install");
  const coh = promptCheckSeat(CTX, { seat: "coherence", persona: present, roster }).prompt;
  assert.ok(coh.includes(`YOUR PERSONA FILE: ${present}`));
  // The scorer, the lens picks and a research helper fall back the same way.
  const scorer = promptScorer(CTX, { deepening: fileOf(r, "deepening-workflow")?.path ?? null, finalReview: fileOf(r, "final-review").path, index: INDEX, deepened: false }).prompt;
  assert.match(scorer, /CE's deepening-workflow\.md is missing in this run/);
  assert.match(scorer, /Implementation Units: unclear or wrong dependency order/);
  assert.ok(scorer.includes(`Read CE's ${fileOf(r, "final-review").path}, sections 5.3.1 and 5.3.2`));
  const picks = promptLensPicks({ plan: CTX.plan, personaSelection: fileOf(r, "persona-selection")?.path ?? null }).prompt;
  assert.match(picks, /persona-selection\.md is missing in this run/);
  assert.doesNotMatch(picks, /THE LENS RULE/);
  const web = promptResearch(CTX, { agent: "web-researcher", agentFile: fileOf(r, "web-researcher")?.path ?? null, request: "r", brief: "C:/runs/brief.md", dossier: "C:/runs/research/web.md" }).prompt;
  assert.match(web, /CE's agent file for web-researcher is missing in this run, so research by your own method \(the receipt/);
  assert.doesNotMatch(web, /YOUR AGENT FILE|THE LENS RULE/);
});

test("a template with an unfilled slot throws naming it, the contract brief included; a value's own braces are left alone", () => {
  assert.throws(() => promptFill("read {plan} then {brief}", { plan: "C:/p.md" }), /the slot \{brief\} is unfilled/);
  assert.throws(() => promptFill("read {plan}", { plan: "  " }), /the slot \{plan\} is empty/);
  assert.throws(() => promptFill("read {plan}", { plan: null }), /the slot \{plan\} is unfilled/);
  assert.equal(promptFill("a {x} b", { x: "{y} $& $' $$" }), "a {y} $& $' $$ b");
  assert.throws(() => promptCheckSeat({ ...CTX, contractBrief: undefined }, { seat: "coherence", persona: null, roster: ["coherence"] }), /ctx\.contractBrief/);
  assert.throws(() => promptCheckSeat({ ...CTX, contractBrief: " \n" }, { seat: "coherence", persona: null, roster: ["coherence"] }), /ctx\.contractBrief/);
  assert.throws(() => promptPremise({ ...CTX, claudeMd: undefined }, { request: "r", brief: "C:/b.md" }), /ctx\.claudeMd/);
  assert.throws(() => promptPremise({ ...CTX, laws: {} }, { request: "r", brief: "C:/b.md" }), /ctx\.laws\.finder/);
  assert.throws(() => promptPremise(CTX, { brief: "C:/b.md" }), /request/);
  assert.throws(() => promptScorer({ ...CTX, lastLine: { line: 0, text: "x" } }, { deepening: null, finalReview: null, index: INDEX, deepened: false }), /ctx\.lastLine/);
  assert.throws(() => promptCheckSeat({ ...CTX, plan: "runs/plan.md" }, { seat: "coherence", persona: null, roster: ["coherence"] }), /absolute path/);
  const none = promptPremise({ ...CTX, claudeMd: [] }, { request: "r", brief: "C:/b.md" }).prompt;
  assert.match(none, /none \(the project has no CLAUDE\.md of its own\)/);
});

test("the roster and round inputs are checked: an unknown or doubled seat, a seat outside its roster, the adversary beside the panel, a persona on our seats, a later round with no changes", () => {
  const seat = (over) => () => promptCheckSeat(CTX, { seat: "coherence", persona: null, roster: ALWAYS, ...over });
  assert.throws(seat({ seat: "whole-doc" }), /no check seat/);
  assert.throws(seat({ roster: ["coherence", "coherence"] }), /names a seat twice/);
  assert.throws(seat({ roster: ["coherence", "whole-doc"] }), /no check seat/);
  assert.throws(seat({ roster: ["feasibility"] }), /does not name coherence/);
  assert.throws(seat({ roster: ["coherence", "adversarial", "adv-settled"] }), /never both/);
  assert.throws(seat({ round: 2 }), /needs the changed sentences/);
  assert.throws(seat({ round: 4, changes: ["x"] }), /round is 1, 2 or 3/);
  assert.throws(seat({ changes: ["x"] }), /round 1 has no changes/);
  assert.throws(() => promptCheckSeat(CTX, { seat: "reach", persona: "C:/ce/reach.md", roster: ["coherence", "reach"] }), /reads no CE file/);
  const r2 = promptCheckSeat(CTX, { seat: "coherence", persona: null, roster: ["coherence"], round: 2, changes: ["U2 now writes the ledger in cents."] }).prompt;
  assert.match(r2, /THIS IS CHECK ROUND 2\./);
  assert.ok(r2.includes("- U2 now writes the ledger in cents."));
  assert.doesNotMatch(promptCheckSeat(CTX, { seat: "coherence", persona: null, roster: ["coherence"] }).prompt, /THIS IS CHECK ROUND/);
});

test("the scorer lists every index heading by its line, says a row covers its subtree, never scores a heading the index lacks, and adds our four checklists", () => {
  const p = promptScorer(CTX, { deepening: "C:/ce/dw.md", finalReview: "C:/ce/fr.md", index: [...INDEX].reverse(), deepened: true }).prompt;
  const listed = [...p.matchAll(/^- line (\d+): (#+) (.*?)( \(has text of its own\))?$/gm)].map((m) => ({ line: Number(m[1]), level: m[2].length, heading: m[3], own: Boolean(m[4]) }));
  assert.deepEqual(listed, INDEX);
  assert.match(p, /A row covers its heading's subtree: the heading and everything under it, up to the next heading at its level or shallower/);
  assert.match(p, /Never score a heading the index does not list/);
  assert.match(p, /never put a row at the plan's title/);
  assert.match(p, /Do not add CE's critical-section bonus/);
  for (const kind of ["goal-problem", "assumptions", "verification", "done"]) assert.ok(p.includes(`(kind ${kind}):`), `no checklist for ${kind}`);
  assert.match(p, /set strengthened true on each section an earlier deepen substantially strengthened/);
  assert.match(promptScorer(CTX, { deepening: null, finalReview: null, index: INDEX, deepened: false }).prompt, /strengthened is false on every row/);
  assert.throws(() => promptScorer(CTX, { deepening: null, finalReview: null, index: INDEX }), /deepened says/);
  assert.throws(() => promptScorer(CTX, { deepening: null, finalReview: null, index: [], deepened: false }), /section index/);
  assert.throws(() => promptScorer(CTX, { deepening: null, finalReview: null, index: [{ line: 1, level: 1, heading: "x" }], deepened: false }), /malformed section index entry/);
});

test("a deepen helper reads its section's span, gets the scorer's note and the risk profile, and proposes old_values for the fold's drift grep", () => {
  const p = promptAmendment(CTX, { agent: "repo-research-analyst", agentFile: "C:/ce/agents/repo-research-analyst.md", scope: "patterns", line: 61, index: INDEX, triggers: "test scenarios name no inputs", depth: "Deep", risk: ["security", "parity"] }).prompt;
  assert.ok(p.includes("YOUR AGENT FILE: C:/ce/agents/repo-research-analyst.md (Scope: patterns)\nRead it first"));
  assert.ok(p.includes("THE SECTION: \"U1. Parser\", lines 61 to 139 of the plan."));
  assert.ok(p.includes("the scorer found these problems in it: test scenarios name no inputs"));
  assert.ok(p.includes("THE PLAN'S DEPTH AND RISK: Deep; high-risk signals: security, parity."));
  assert.match(p, /old_values \(up to three exact phrases the change replaces, at least 3 characters each/);
  assert.match(p, /P1 when it changes a decision or a unit, P2 otherwise/);
  const last = promptAmendment(CTX, { agent: "architecture-strategist", agentFile: null, line: 300, index: INDEX, triggers: "t", depth: "Standard", risk: [] }).prompt;
  assert.ok(last.includes(`lines 300 to ${CTX.lastLine.line} of the plan`));
  assert.ok(last.includes("high-risk signals: none."));
  // A section with children spans them all, up to the next heading at its level or shallower.
  const parent = promptAmendment(CTX, { agent: "architecture-strategist", agentFile: null, line: 60, index: INDEX, triggers: "t", depth: "Standard", risk: [] }).prompt;
  assert.ok(parent.includes("THE SECTION: \"Implementation Units\", lines 60 to 299 of the plan."));
  assert.throws(() => promptAmendment(CTX, { agent: "architecture-strategist", agentFile: null, line: 62, index: INDEX, triggers: "t", depth: "Standard", risk: [] }), /line 62 is no heading/);
  assert.throws(() => promptAmendment(CTX, { agent: "architecture-strategist", agentFile: null, line: 60, index: INDEX, triggers: "t", depth: "Standard", risk: ["money"] }), /risk signals/);
  assert.throws(() => promptAmendment(CTX, { agent: "whole-doc-reviewer", agentFile: null, line: 60, index: INDEX, triggers: "t", depth: "Standard", risk: [] }), /not a deepen agent/);
});

test("a verifier takes one refuter angle and asks real, material, new, severity and the fix as separate questions, worded for a finding or an amendment", () => {
  const item = { title: "U2 writes floats", section: "U2. Writer", line: 141 };
  for (let angle = 0; angle < PROMPT_REFUTER_ANGLES.length; angle++) {
    const p = promptVerifier(CTX, { item, kind: "finding", angle }).prompt;
    assert.ok(p.includes(`YOUR REFUTER ANGLE: ${PROMPT_REFUTER_ANGLES[angle]}`));
    for (const other of PROMPT_REFUTER_ANGLES.filter((_, i) => i !== angle)) assert.ok(!p.includes(other), "a verifier got two angles");
    assert.ok(p.includes(`THE FINDING (JSON): ${JSON.stringify(item)}`));
    for (const q of ["- real:", "- material:", "- new:", "- corrected_severity:", "- fix_is_correct:"]) assert.ok(p.includes(q), `no ${q}`);
    assert.match(p, /Default real=false when you cannot confirm it/);
  }
  const a = promptVerifier(CTX, { item, kind: "amendment", angle: 1 }).prompt;
  assert.ok(a.includes("THE PROPOSED AMENDMENT (JSON)"));
  assert.match(a, /- corrected_severity: P1 when the change alters a decision or a unit, P2 otherwise/);
  assert.throws(() => promptVerifier(CTX, { item, kind: "finding", angle: 3 }), /angle is an index/);
  assert.throws(() => promptVerifier(CTX, { item, kind: "vote", angle: 0 }), /kind is "finding" or "amendment"/);
  assert.throws(() => promptVerifier(CTX, { item: null, kind: "finding", angle: 0 }), /to verify is required/);
});

test("a research helper writes one dossier, returns a gist, and the learnings researcher searches this repo's own lesson folders", () => {
  const p = promptResearch(CTX, { agent: "learnings-researcher", agentFile: "C:/ce/agents/learnings-researcher.md", request: "add a CSV export", brief: "C:/runs/brief.md", dossier: "C:/runs/research/learnings.md", learnings: { insights: "C:/repo/projects/x/docs/insights", memory: "C:/home/.claude/projects/C--repo/memory" } }).prompt;
  assert.ok(p.includes("Write exactly one file, your dossier at C:/runs/research/learnings.md; create, edit or delete no other file."));
  assert.ok(p.includes("C:/repo/projects/x/docs/insights") && p.includes("C:/home/.claude/projects/C--repo/memory"));
  assert.match(p, /never a fixed docs\/solutions path/);
  assert.doesNotMatch(p, /Create, edit or delete no file anywhere/);
  assert.throws(() => promptResearch(CTX, { agent: "learnings-researcher", agentFile: null, request: "r", brief: "C:/b.md", dossier: "C:/d.md" }), /needs learnings/);
  assert.throws(() => promptResearch(CTX, { agent: "web-researcher", agentFile: null, request: "r", brief: "C:/b.md", dossier: "C:/d.md", learnings: { insights: "C:/i", memory: "C:/m" } }), /for the learnings researcher only/);
  assert.throws(() => promptResearch(CTX, { agent: "web-researcher", agentFile: null, request: "r", brief: "C:/b.md", dossier: "d.md" }), /absolute path/);
  const seat = promptCheckSeat(CTX, { seat: "coherence", persona: null, roster: ["coherence"] }).prompt;
  assert.ok(seat.includes("Create, edit or delete no file anywhere"), "a check seat may write");
});

test("a short reader's re-run names the sections it missed ahead of its own prompt and keeps its schema", () => {
  const seat = promptCheckSeat(CTX, { seat: "coherence", persona: null, roster: ["coherence"] });
  const again = promptShortRead(seat, { missed: [{ line: 140, heading: "U2. Writer" }, { line: 300, heading: "Verification Contract" }], stoppedAt: 139 });
  assert.equal(again.schema, "finder");
  assert.ok(again.prompt.startsWith("YOUR LAST READ OF THIS PLAN STOPPED SHORT at line 139, so these sections went unread:\n- line 140: U2. Writer\n- line 300: Verification Contract\n"));
  assert.ok(again.prompt.endsWith(seat.prompt));
  assert.notEqual(again.prompt, seat.prompt);
  assert.throws(() => promptShortRead(seat, { missed: [], stoppedAt: 139 }), /names the sections it missed/);
  assert.throws(() => promptShortRead(promptVerifier(CTX, { item: {}, kind: "finding", angle: 0 }), { missed: [{ line: 1, heading: "x" }], stoppedAt: 0 }), /whole-plan reader/);
});

test("the lens picks read only the three conditional lenses, keep the always-on seats, and never follow depth.md", () => {
  const p = promptLensPicks({ plan: CTX.plan, personaSelection: "C:/ce/persona-selection.md" }).prompt;
  assert.match(p, /Use only its activation signals for product-lens, security-lens and design-lens/);
  assert.match(p, /Coherence, feasibility, scope-guardian and the adversary always run here/);
  assert.match(p, /never follow the file's pointer to depth\.md/);
  assert.match(p, /key lenses/);
});

test("the same inputs build the same prompt, byte for byte (a Workflow resume's cache keys on it)", () => {
  const a = everyBuilder().map(([n, b]) => [n, b.prompt, b.schema]);
  const b = everyBuilder().map(([n, b2]) => [n, b2.prompt, b2.schema]);
  assert.deepEqual(a, b);
});

test("every prompt is ASCII, so a Workflow script that inlines it stays ASCII", () => {
  for (const [name, built] of everyBuilder()) {
    const bad = [...built.prompt].find((c) => c.codePointAt(0) > 127);
    assert.equal(bad, undefined, `${name} holds ${JSON.stringify(bad)}`);
  }
});
