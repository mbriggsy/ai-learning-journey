import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROMPT_AGENTS, PROMPT_ANGLE_LIST, PROMPT_CHECK_SEATS, PROMPT_OWNS, PROMPT_QUOTE, PROMPT_REFUTER_ANGLES, promptAmendment, promptCheckSeat, promptContractBrief, promptFill,
  promptLensPicks, promptPremise, promptResearch, promptScorer, promptShortRead, promptVerifier,
} from "./prompts.mjs";
import { CRITICAL_KINDS } from "./select.mjs";
import { RISK_SIGNALS, SCHEMAS, SECTION_KINDS, SIZE_LAWS, budgetOf } from "./caps.mjs";
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
  request: "Add a CSV export of the ledger, one row per posting.",
  brief: "C:/runs/brief.md",
  update: false,
  lands: "C:/repo/projects/x/docs/plans/ledger-export.md",
};
// The same run as an update of a committed plan given no brief (flow.mjs firstStage starts it at
// the deepen, so no /brief ran).
const UPD = { ...CTX, update: true, brief: null };
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
const FULL_PANEL = ["coherence", "feasibility", "scope-guardian", ...PANEL];
const personaOf = (seat) => (PROMPT_CHECK_SEATS[seat].ce === null ? null : `C:/ce/personas/${seat}.md`);
const rosterFor = (seat) => (seat.startsWith("adv-") ? FULL_PANEL : [...new Set(["coherence", seat])]);
const EDIT = [{ kind: "edit", text: "U2 now writes the ledger in cents." }];

// Every builder, called once with valid input: [name, built, kinds, schema], where kinds says what
// the prompt must carry ("after" a helper that runs after the contract brief, "reader" a whole-plan
// reader, "roster" a seat told the roster, "told" a seat an update run warns about the named path,
// "dossier" the one helper that writes a file, "main" the main loop's own instruction, which no
// helper reads, so it carries no helper rules) and schema the caps.mjs key it must return.
function everyBuilder(ctx = CTX) {
  const out = [
    ["contract brief", promptContractBrief({ planPath: "C:/repo/projects/x/docs/plans/p.md", project: ctx.project, claudeMd: ctx.claudeMd, insights: "C:/repo/projects/x/docs/insights", request: "add a CSV export" }), [], null],
    ["research", promptResearch(ctx, { agent: "repo-research-analyst", agentFile: "C:/ce/agents/repo-research-analyst.md", scope: "architecture, patterns", dossier: "C:/runs/research/repo.md" }), ["after", "dossier"], "gist"],
    ["external research", promptResearch(ctx, { agent: "web-researcher", agentFile: "C:/ce/agents/web-researcher.md", focus: "CSV dialects spreadsheet tools read", dossier: "C:/runs/research/web.md" }), ["after", "dossier"], "gist"],
    ["premise (deepen)", promptPremise(ctx, { mode: "deepen" }), ["after", "reader", "told"], "finder"],
    ["premise (check)", promptPremise(ctx, { mode: "check", roster: [...ALWAYS, "premise"] }), ["after", "reader", "roster", "told"], "finder"],
    ["scorer", promptScorer(ctx, { deepening: "C:/ce/dw.md", finalReview: "C:/ce/fr.md", index: INDEX, deepened: false }), ["after", "reader"], "scorer"],
    ["amendment", promptAmendment(ctx, { agent: "architecture-strategist", agentFile: "C:/ce/agents/architecture-strategist.md", line: 60, index: INDEX, triggers: "dependency order unclear", depth: "Standard", risk: ["rollout"] }), ["after"], "amendment"],
    ["verifier (finding)", promptVerifier(ctx, { item: { title: "x" }, kind: "finding", angle: 0 }), ["after", "told"], "verdict"],
    ["verifier (amendment)", promptVerifier(ctx, { item: { title: "x" }, kind: "amendment", angle: 0, line: 60, index: INDEX, triggers: "dependency order unclear" }), ["after", "told"], "verdict"],
    ["lens picks", promptLensPicks({ plan: ctx.plan, personaSelection: "C:/ce/persona-selection.md" }), ["main"], null],
  ];
  for (const seat of CHECK_SEATS) out.push([`check seat ${seat}`, promptCheckSeat(ctx, { seat, persona: personaOf(seat), roster: rosterFor(seat) }), ["after", "reader", "roster", "told"], "finder"]);
  return out;
}

// The roster table a prompt carries: [seat key, the class it owns] per line, in order.
function rosterOf(prompt) {
  const block = prompt.split("THE ROSTER AND OWNERSHIP TABLE:")[1];
  assert.ok(block, "the prompt carries no roster table");
  const lines = block.split("\n\n")[0].split("\n").slice(1);
  return lines.map((l) => l.match(/^- ([a-z-]+): (.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]);
}
const tableOf = (roster) => roster.map((k) => [k, PROMPT_OWNS[k]]);

test("the seat table matches resolve-ce.mjs: every seat known, the panel the same four keys, our seats the ones that read no CE file", () => {
  for (const seat of CHECK_SEATS) {
    assert.ok(KNOWN_SEATS.has(seat), `${seat} is no seat resolve-ce.mjs knows`);
    const ce = PROMPT_CHECK_SEATS[seat].ce;
    if (ce === null) assert.ok(SEATS_WITHOUT_CE.includes(seat), `${seat} reads no CE file but is not in SEATS_WITHOUT_CE`);
    else assert.ok(CE_FILES.find((f) => f.key === ce)?.seats.includes(seat), `CE_FILES' ${ce} entry does not name ${seat} among its seats`);
  }
  assert.deepEqual(CHECK_SEATS.filter((s) => s.startsWith("adv-")), PANEL);
  // The ownership table holds every check seat and the premise seat, which promptPremise builds.
  assert.deepEqual(Object.keys(PROMPT_OWNS).filter((s) => !CHECK_SEATS.includes(s)), ["premise"]);
  assert.deepEqual(Object.keys(PROMPT_OWNS).filter((s) => !CHECK_SEATS.includes(s) || PROMPT_CHECK_SEATS[s].ce === null).sort(), [...SEATS_WITHOUT_CE].sort());
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
  assert.equal(PROMPT_QUOTE, budgetOf("lastLineText"), "the inventory quote's length is caps.mjs's lastLineText budget");
});

test("every builder returns its own schema key; every helper carries the WebFetch ban, the never-ask line, the read-only commands, the Grep and Glob path rule and its write rule; a CE file named means the lens rule", () => {
  for (const [name, built, kinds, schema] of everyBuilder()) {
    assert.equal(built.schema, schema, `${name}: schema key`);
    const p = built.prompt;
    if (/YOUR AGENT FILE|YOUR PERSONA FILE|Read CE's |\(CE's persona-selection\.md\)/.test(p)) assert.match(p, /THE LENS RULE: a CE file supplies your lens only/, `${name} names a CE file but carries no lens rule`);
    if (kinds.includes("main")) continue;
    assert.match(p, /never use WebFetch/, `${name}: no WebFetch ban`);
    assert.match(p, /Never ask the user anything/, `${name}: no never-ask line`);
    assert.ok(p.includes("Run only read-only commands (git log, git show, git grep, a node one-liner that reads)"), `${name}: no read-only command rule`);
    assert.ok(p.includes("Use absolute paths, and give every Grep and Glob an absolute path."), `${name}: no Grep and Glob path rule`);
    // The lens rule makes this block the complete tool list, so Context7 is named in it (R4-22).
    assert.ok(p.includes("For a library's documentation, use Context7 first (load its tools with ToolSearch \"context7\"), at the version the repo pins, and gemini-grounding or curl when Context7 lacks the library."), `${name}: no Context7 line`);
    if (kinds.includes("dossier")) {
      assert.match(p, /Write exactly one file, your dossier at C:\/runs\/research\/[a-z]+\.md; create, edit or delete no other file\./, `${name}: no dossier rule`);
      assert.doesNotMatch(p, /Create, edit or delete no file anywhere/, `${name}: a dossier writer told to write nothing`);
    } else assert.ok(p.includes("Create, edit or delete no file anywhere: no notes, no probes, no scratch files."), `${name}: no no-write rule`);
    if (built.schema !== null) {
      assert.ok(Object.hasOwn(SCHEMAS, built.schema), `${name}: schema ${built.schema} is no caps.mjs schema`);
      assert.ok(p.endsWith(SIZE_LAWS[built.schema]), `${name}: its prompt does not end with ${built.schema}'s size law`);
    }
  }
});

test("every helper after the contract brief carries the contract brief, the CLAUDE.md paths and the request; every whole-plan reader pages to the last line by its number and is never handed its text", () => {
  for (const [name, built, kinds] of everyBuilder()) {
    const p = built.prompt;
    if (kinds.includes("after")) {
      assert.ok(p.includes(CTX.contractBrief), `${name}: no contract brief`);
      for (const c of CTX.claudeMd) assert.ok(p.includes(c), `${name}: no ${c}`);
      assert.ok(p.includes(`THE REQUEST (what was asked for):\n${CTX.request}\nTHE BRIEF it was planned from: ${CTX.brief} (read it).`), `${name}: no request and brief`);
    }
    if (kinds.includes("reader")) {
      assert.ok(p.includes(`READ THE WHOLE PLAN: ${CTX.plan}`), `${name}: no paging rule`);
      assert.ok(p.includes(`It ends at line ${CTX.lastLine.line}.`), `${name}: the last line's number is missing`);
      assert.match(p, /pages of at most 160 lines/, `${name}: no page size`);
      assert.ok(p.includes(`the number and the first ${PROMPT_QUOTE} characters of the last line holding text that you read, as Read returned it, without Read's line-number prefix`), `${name}: no inventory ask`);
      // KTD7's check compares the reader's quote with the last line: a prompt that quotes it hands
      // a reader that never reached the end the answer.
      assert.doesNotMatch(p, />>>|<<</, `${name}: the old quote markers`);
      assert.ok(!p.includes(CTX.lastLine.text.slice(0, 40)), `${name}: the last line's text is in the prompt`);
    } else assert.doesNotMatch(p, /READ THE WHOLE PLAN/, `${name} is no whole-plan reader`);
  }
});

test("a whole-plan reader's schema carries the reading inventory; the others' do not claim it", () => {
  for (const [name, built, kinds] of everyBuilder()) {
    if (built.schema === null) continue;
    const has = Object.hasOwn(SCHEMAS[built.schema].properties, "last_line_number");
    assert.equal(has, kinds.includes("reader"), `${name}: schema ${built.schema} ${has ? "has" : "lacks"} the inventory`);
  }
});

test("every builder after the contract brief requires the request, and a brief unless the run updates a committed plan", () => {
  const builders = {
    research: (ctx) => promptResearch(ctx, { agent: "repo-research-analyst", agentFile: null, dossier: "C:/runs/research/repo.md" }),
    premise: (ctx) => promptPremise(ctx, { mode: "deepen" }),
    scorer: (ctx) => promptScorer(ctx, { deepening: null, finalReview: null, index: INDEX, deepened: false }),
    amendment: (ctx) => promptAmendment(ctx, { agent: "architecture-strategist", agentFile: null, line: 60, index: INDEX, triggers: "t", depth: "Standard", risk: [] }),
    verifier: (ctx) => promptVerifier(ctx, { item: { title: "x" }, kind: "finding", angle: 0 }),
    "check seat": (ctx) => promptCheckSeat(ctx, { seat: "coherence", persona: null, roster: ["coherence"] }),
  };
  for (const [name, build] of Object.entries(builders)) {
    assert.throws(() => build({ ...CTX, request: undefined }), /ctx\.request/, `${name} built with no request`);
    assert.throws(() => build({ ...CTX, request: "  " }), /ctx\.request/, `${name} built with an empty request`);
    assert.throws(() => build({ ...CTX, update: undefined }), /ctx\.update/, `${name} built with no update flag`);
    assert.throws(() => build({ ...CTX, brief: null }), /only an update run may have none/, `${name} built a new plan with no brief`);
    assert.throws(() => build({ ...CTX, brief: undefined }), /ctx\.brief/, `${name} built with the brief left out`);
    assert.throws(() => build({ ...CTX, brief: "runs/brief.md" }), /absolute path/, `${name} took a relative brief`);
    // An update run with no brief judges the goal against the request, never the plan's own capsule.
    const p = build(UPD).prompt;
    assert.ok(p.includes(`THE REQUEST (what was asked for):\n${CTX.request}\nTHE BRIEF: none.`), `${name}: no brief-less request block`);
    assert.match(p, /judge the goal against the request and any origin document the plan cites, never against the plan's own Goal Capsule/, `${name}: the update rule`);
    assert.doesNotMatch(p, /THE BRIEF it was planned from/, `${name}: a brief named on a brief-less run`);
  }
  // An update run may still have a brief.
  assert.ok(promptPremise({ ...UPD, brief: CTX.brief }, { mode: "deepen" }).prompt.includes(`THE BRIEF it was planned from: ${CTX.brief}`));
});

test("the premise seat asks for the goal against the request and the brief, or the request alone on a brief-less update", () => {
  const p = promptPremise(CTX, { mode: "deepen" }).prompt;
  assert.match(p, /3\. THE GOAL: is the plan's goal the one asked for in the request and the brief\?/);
  const u = promptPremise(UPD, { mode: "deepen" }).prompt;
  assert.match(u, /3\. THE GOAL: is the plan's goal the one asked for in the request\? /);
  assert.doesNotMatch(u, /and the brief/);
});

test("on an update run every check seat, the premise seat and every verifier is told the named path holds the plan's own earlier version; a new plan's seats are told nothing", () => {
  const note = `THIS RUN UPDATES A COMMITTED PLAN: ${CTX.lands} holds HEAD's earlier version of this plan, which the landing replaces. It is never a stale doc, a counterexample or a target for the plan's docs unit.`;
  for (const [name, built, kinds] of everyBuilder(UPD)) {
    if (kinds.includes("told")) assert.ok(built.prompt.includes(note), `${name}: no update note`);
    else assert.doesNotMatch(built.prompt, /THIS RUN UPDATES A COMMITTED PLAN/, `${name} carries the update note`);
  }
  for (const [name, built] of everyBuilder(CTX)) assert.doesNotMatch(built.prompt, /THIS RUN UPDATES A COMMITTED PLAN|earlier version of this plan/, `${name}: an update note on a new plan`);
  assert.throws(() => promptCheckSeat({ ...UPD, lands: undefined }, { seat: "blast-radius", persona: null, roster: ["coherence", "blast-radius"] }), /ctx\.lands/);
  assert.throws(() => promptVerifier({ ...UPD, lands: "docs/plans/p.md" }, { item: { title: "x" }, kind: "finding", angle: 0 }), /absolute path/);
  // A new plan's seats need no named path.
  assert.ok(promptCheckSeat({ ...CTX, lands: undefined }, { seat: "blast-radius", persona: null, roster: ["coherence", "blast-radius"] }).prompt);
});

test("the check has a premise seat: promptPremise in check mode carries the roster and the round, every roster may name it, and promptCheckSeat refuses to build it", () => {
  const roster = [...ALWAYS, "premise", "reach", "blast-radius", "test-vacuity"];
  const p = promptPremise(CTX, { mode: "check", roster }).prompt;
  assert.match(p, /^You are the premise seat in the check of a plan: /);
  assert.deepEqual(rosterOf(p), tableOf(roster));
  assert.equal(PROMPT_OWNS.premise, "the plan's premise: whether the problem is real and the goal is the one asked for");
  for (const part of ["1. THE INCIDENT", "2. THE POPULATION", "3. THE GOAL", "4. NO SUPPRESSION"]) assert.ok(p.includes(part), `the check's premise seat lacks ${part}`);
  assert.doesNotMatch(p, /THIS IS CHECK ROUND/);
  for (const seat of ["coherence", "reach", "adversarial"]) {
    const s = promptCheckSeat(CTX, { seat, persona: personaOf(seat), roster }).prompt;
    assert.deepEqual(rosterOf(s), tableOf(roster), `${seat}'s roster names the premise seat`);
  }
  const r2 = promptPremise(CTX, { mode: "check", roster: ["coherence", "premise"], round: 2, changes: EDIT }).prompt;
  assert.match(r2, /THIS IS CHECK ROUND 2\./);
  assert.ok(r2.includes("- edited: U2 now writes the ledger in cents."));
  const d = promptPremise(CTX, { mode: "deepen" }).prompt;
  assert.match(d, /^You are the premise seat in the deepen of a plan: /);
  assert.doesNotMatch(d, /THE ROSTER AND OWNERSHIP TABLE|THIS IS CHECK ROUND/);
  assert.throws(() => promptPremise(CTX, {}), /mode is "deepen" or "check"/);
  assert.throws(() => promptPremise(CTX, { mode: "deepen", roster }), /runs beside the scorer/);
  assert.throws(() => promptPremise(CTX, { mode: "check", roster: ALWAYS }), /does not name premise/);
  assert.throws(() => promptPremise(CTX, { mode: "check", roster, round: 2 }), /needs the changes/);
  assert.throws(() => promptCheckSeat(CTX, { seat: "premise", persona: null, roster }), /promptPremise/);
});

test("with one conditional lens unselected and reach skipped, every seat's roster lists exactly the running seats, each with the class it owns, and names neither skipped seat", () => {
  const roster = [...ALWAYS, "product", "security", "blast-radius", "test-vacuity"];
  for (const seat of roster) {
    const p = promptCheckSeat(CTX, { seat, persona: personaOf(seat), roster }).prompt;
    assert.deepEqual(rosterOf(p), tableOf(roster), `${seat}'s roster`);
    for (const skipped of ["design", "reach"]) assert.doesNotMatch(p, new RegExp(`^- ${skipped}: `, "m"), `${seat} names ${skipped} as an owner`);
  }
  const p = promptCheckSeat(CTX, { seat: "adv-hidden-work", persona: personaOf("adv-hidden-work"), roster: FULL_PANEL }).prompt;
  assert.deepEqual(rosterOf(p), tableOf(FULL_PANEL));
  assert.doesNotMatch(p, /^- adversarial: /m);
  for (const k of CHECK_SEATS) assert.equal(PROMPT_OWNS[k], PROMPT_CHECK_SEATS[k].owns, `${k}'s owned class`);
});

test("the premise prompt carries all four parts of its charter, with the request and the brief", () => {
  const p = promptPremise(CTX, { mode: "deepen" }).prompt;
  assert.match(p, /1\. THE INCIDENT: for every guard, gate, check or safety mechanism the plan adds, the incident it answers: a commit, a transcript or a measured case/);
  assert.match(p, /2\. THE POPULATION: for every feature, an instance of the population it serves that exists in today's code/);
  assert.match(p, /3\. THE GOAL: is the plan's goal the one asked for in the request and the brief\?/);
  assert.match(p, /4\. NO SUPPRESSION: CE's rule that switches the premise challenge off when a plan has an origin .* never applies here/);
  assert.ok(p.includes(CTX.request));
  assert.ok(p.includes(`THE BRIEF it was planned from: ${CTX.brief} (read it).`));
});

test("every check seat carries the never-a-false-positive line for its own class and the settlement rule; every persona seat the lens rule and the plan precedence block", () => {
  for (const seat of CHECK_SEATS) {
    const p = promptCheckSeat(CTX, { seat, persona: personaOf(seat), roster: rosterFor(seat) }).prompt;
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
  const angled = promptCheckSeat(CTX, { seat: "adv-sequencing", persona: personaOf("adv-sequencing"), roster: FULL_PANEL }).prompt;
  assert.ok(angled.includes(`YOUR ASSIGNED ANGLE, hunt only this seam (the roster names the other owners): ${PROMPT_CHECK_SEATS["adv-sequencing"].angle}.`));
  assert.doesNotMatch(angled, /Pick the angles that fit|the other panelists own the rest/);
});

test("the four panel angles together cover the single adversary's angle list, the unsettled decision and the unchecked assumption included", () => {
  const single = promptCheckSeat(CTX, { seat: "adversarial", persona: null, roster: ALWAYS }).prompt;
  for (const angle of PROMPT_ANGLE_LIST) {
    assert.ok(single.includes(angle), `the single adversary is not told "${angle}"`);
    assert.ok(PANEL.some((k) => PROMPT_CHECK_SEATS[k].angle.includes(angle)), `no panel seat's angle carries "${angle}"`);
  }
  for (const angle of ["a decision, settled or not, that cannot reach its outcome", "any assumption the plan never checks"]) assert.ok(PROMPT_ANGLE_LIST.includes(angle), `the angle list lacks "${angle}"`);
  assert.ok(PROMPT_CHECK_SEATS["adv-settled"].owns.includes("settled or not"), "adv-settled owns only settled decisions");
  assert.ok(PROMPT_CHECK_SEATS["adv-settled"].owns.includes("assumptions the plan never checks"), "adv-settled does not own unchecked assumptions");
});

test("a panel seat that runs without the others in a later round leads with its angle and reports the absent panelists' seams; with them all running it hunts its seam alone", () => {
  const alone = promptCheckSeat(CTX, { seat: "adv-hidden-work", persona: null, roster: ["coherence", "adv-hidden-work"], round: 2, changes: EDIT }).prompt;
  assert.ok(alone.includes(`YOUR ASSIGNED ANGLE, lead with this seam: ${PROMPT_CHECK_SEATS["adv-hidden-work"].angle}.`));
  for (const k of ["adv-sequencing", "adv-settled", "adv-verification"]) assert.ok(alone.includes(PROMPT_CHECK_SEATS[k].angle), `the lone panelist is not given ${k}'s seam`);
  assert.doesNotMatch(alone, /hunt only this seam/);
  // Two panelists running: the first in the roster takes the absent two's seams; the other names it.
  const two = ["coherence", "adv-settled", "adv-verification"];
  const first = promptCheckSeat(CTX, { seat: "adv-settled", persona: null, roster: two, round: 2, changes: EDIT }).prompt;
  assert.ok(first.includes("YOUR ASSIGNED ANGLE, lead with this seam: "));
  for (const k of ["adv-sequencing", "adv-hidden-work"]) assert.ok(first.includes(PROMPT_CHECK_SEATS[k].angle), `the first panelist is not given ${k}'s seam`);
  assert.ok(!first.includes(PROMPT_CHECK_SEATS["adv-verification"].angle), "the first panelist is given a running panelist's seam");
  const second = promptCheckSeat(CTX, { seat: "adv-verification", persona: null, roster: two, round: 2, changes: EDIT }).prompt;
  assert.ok(second.includes(`YOUR ASSIGNED ANGLE, hunt only this seam (the roster names the other owners, and adv-settled reports the seams of the panelists not running): ${PROMPT_CHECK_SEATS["adv-verification"].angle}.`));
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
  assert.ok(scorer.includes(`Read CE's ${fileOf(r, "final-review").path}, section 5.3.1 alone`));
  const picks = promptLensPicks({ plan: CTX.plan, personaSelection: fileOf(r, "persona-selection")?.path ?? null }).prompt;
  assert.match(picks, /persona-selection\.md is missing in this run/);
  assert.doesNotMatch(picks, /THE LENS RULE/);
  const web = promptResearch(CTX, { agent: "web-researcher", agentFile: fileOf(r, "web-researcher")?.path ?? null, focus: "f", dossier: "C:/runs/research/web.md" }).prompt;
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
  assert.throws(() => promptPremise({ ...CTX, claudeMd: undefined }, { mode: "deepen" }), /ctx\.claudeMd/);
  assert.throws(() => promptPremise({ ...CTX, laws: {} }, { mode: "deepen" }), /ctx\.laws\.finder/);
  assert.throws(() => promptScorer({ ...CTX, lastLine: { line: 0, text: "x" } }, { deepening: null, finalReview: null, index: INDEX, deepened: false }), /ctx\.lastLine/);
  assert.throws(() => promptCheckSeat({ ...CTX, plan: "runs/plan.md" }, { seat: "coherence", persona: null, roster: ["coherence"] }), /absolute path/);
  const none = promptPremise({ ...CTX, claudeMd: [] }, { mode: "deepen" }).prompt;
  assert.match(none, /none \(the project has no CLAUDE\.md of its own\)/);
});

test("the roster and round inputs are checked: an unknown or doubled seat, a seat outside its roster, the adversary beside the panel, a persona on our seats, a later round with no changes, a change of no known kind", () => {
  const seat = (over) => () => promptCheckSeat(CTX, { seat: "coherence", persona: null, roster: ALWAYS, ...over });
  assert.throws(seat({ seat: "whole-doc" }), /no check seat/);
  assert.throws(seat({ roster: ["coherence", "coherence"] }), /names a seat twice/);
  assert.throws(seat({ roster: ["coherence", "whole-doc"] }), /no check seat/);
  assert.throws(seat({ roster: ["feasibility"] }), /does not name coherence/);
  assert.throws(seat({ roster: ["coherence", "adversarial", "adv-settled"] }), /never both/);
  assert.throws(seat({ round: 2 }), /needs the changes/);
  assert.throws(seat({ round: 4, changes: EDIT }), /round is 1, 2 or 3/);
  assert.throws(seat({ changes: EDIT }), /round 1 has no changes/);
  assert.throws(seat({ round: 2, changes: ["U2 now writes cents."] }), /a change is \{ kind: "edit" \| "add" \| "delete", text \}/);
  assert.throws(seat({ round: 2, changes: [{ kind: "move", text: "x" }] }), /a change is/);
  assert.throws(seat({ round: 2, changes: [{ kind: "edit", text: " " }] }), /a change is/);
  assert.throws(() => promptCheckSeat(CTX, { seat: "reach", persona: "C:/ce/reach.md", roster: ["coherence", "reach"] }), /reads no CE file/);
  assert.doesNotMatch(promptCheckSeat(CTX, { seat: "coherence", persona: null, roster: ["coherence"] }).prompt, /THIS IS CHECK ROUND/);
});

test("a later round lists each change as the text it added, edited or removed, admits a P0 or P1 anywhere, and in round 3 judges the one fix first", () => {
  const changes = [
    { kind: "edit", text: "U2 now writes the ledger in cents." },
    { kind: "add", text: "R9. The export names its columns.\nEach column has a type." },
    { kind: "delete", text: "U5. The PDF export." },
  ];
  const r2 = promptCheckSeat(CTX, { seat: "coherence", persona: null, roster: ["coherence"], round: 2, changes }).prompt;
  assert.ok(r2.includes("THIS IS CHECK ROUND 2. The plan changed since the last round; these are the changes the fold made, each with the text it added, edited or removed:\n- edited: U2 now writes the ledger in cents.\n- added: R9. The export names its columns.\n  Each column has a type.\n- removed: U5. The PDF export.\n"));
  assert.match(r2, /Report a P0 or P1 wherever you find it in the plan; report a P2 or P3 only where a change causes it or touches it, and put any other in residual_risks\./);
  assert.doesNotMatch(r2, /This round checks one fix alone/);
  const r3 = promptCheckSeat(CTX, { seat: "coherence", persona: null, roster: ["coherence"], round: 3, changes: EDIT }).prompt;
  assert.match(r3, /Report a P0 or P1 wherever you find it in the plan/);
  assert.match(r3, /This round checks one fix alone, the fold of a P0 or P1 that round 2 confirmed: judge that fix and the seams it opened first, and never hold back a P0 or P1 you see anywhere else\./);
});

test("the scorer lists every index heading by its line, marks the title select.mjs reads as needing no row, says a row covers its subtree and how to fit the section limit, keys each note to its row's line, and reads final-review.md 5.3.1 alone", () => {
  const p = promptScorer(CTX, { deepening: "C:/ce/dw.md", finalReview: "C:/ce/fr.md", index: [...INDEX].reverse(), deepened: true }).prompt;
  const listed = [...p.matchAll(/^- line (\d+): (#+) (.*?)( \(has text of its own\)| \(the plan's title: no row; its own text needs none\))?$/gm)].map((m) => ({ line: Number(m[1]), level: m[2].length, heading: m[3], mark: m[4] ?? "" }));
  assert.deepEqual(listed, INDEX.map((h, i) => ({ line: h.line, level: h.level, heading: h.heading, mark: i === 0 ? " (the plan's title: no row; its own text needs none)" : h.own ? " (has text of its own)" : "" })));
  assert.match(p, /A row covers its heading's subtree: the heading and everything under it, up to the next heading at its level or shallower/);
  assert.match(p, /every heading the index marks as having text of its own, except the title, must sit inside some row's subtree/);
  assert.match(p, /never put a row at the heading the index marks as the plan's title: a row there covers nothing/);
  assert.match(p, /Never score a heading the index does not list/);
  assert.match(p, /Do not add CE's critical-section bonus/);
  // The size law states the section limit; the scoring rules never hard-code it.
  assert.match(p, /Cover every section within the size law's limit on sections: when more headings need a row than that limit allows, roll the most alike children into their parent's row until the list fits, and never leave a heading that needs a row outside every row's subtree\./);
  assert.doesNotMatch(p, /Score every section|Rows at children score finer/);
  assert.doesNotMatch(p.slice(0, p.indexOf(SIZE_LAWS.scorer)), new RegExp(`\\b${budgetOf("sections")}\\b`), "the scoring rules hard-code the section limit");
  assert.match(p, /notes: one for each section with 2 points or more .*each carrying its row's line and naming the problems that apply, most serious first\. When more sections reach 2 points than the size law allows notes, note the ones that rank highest, in the run's own order: points \(less 1 for a row marked strengthened on a plan already deepened\), then a row not strengthened before one that was, then a critical kind, then the earlier line\./);
  for (const kind of ["goal-problem", "assumptions", "verification", "done"]) assert.ok(p.includes(`(kind ${kind}):`), `no checklist for ${kind}`);
  assert.match(p, /set strengthened true on each section an earlier deepen substantially strengthened/);
  assert.ok(p.includes("- Read CE's C:/ce/fr.md, section 5.3.1 alone (the plan's depth and its risk profile), for depth and risk_signals. Never run its section 5.3.2 (CE's gate on whether to deepen) or anything that section loads: choosing the sections to deepen is the run's."));
  assert.doesNotMatch(p, /sections 5\.3\.1 and 5\.3\.2/);
  assert.match(p, /- depth: Lightweight, Standard or Deep, by the depth rule above\./);
  assert.match(promptScorer(CTX, { deepening: null, finalReview: null, index: INDEX, deepened: false }).prompt, /strengthened is false on every row/);
  assert.throws(() => promptScorer(CTX, { deepening: null, finalReview: null, index: INDEX }), /deepened says/);
  assert.throws(() => promptScorer(CTX, { deepening: null, finalReview: null, index: [], deepened: false }), /section index/);
  assert.throws(() => promptScorer(CTX, { deepening: null, finalReview: null, index: [{ line: 1, level: 1, heading: "x" }], deepened: false }), /malformed section index entry/);
});

test("a plan with two top-level headings has no title: the scorer marks neither, as select.mjs reads it", () => {
  const twoH1 = [{ line: 1, level: 1, heading: "Part A", own: true }, { line: 40, level: 1, heading: "Part B", own: true }, { line: 41, level: 2, heading: "B.1", own: true }];
  const p = promptScorer(CTX, { deepening: null, finalReview: null, index: twoH1, deepened: false }).prompt;
  assert.doesNotMatch(p, /\(the plan's title: no row/);
  assert.ok(p.includes("- line 1: # Part A (has text of its own)") && p.includes("- line 40: # Part B (has text of its own)"));
  const one = promptScorer(CTX, { deepening: null, finalReview: null, index: [{ line: 3, level: 2, heading: "Only", own: true }], deepened: false }).prompt;
  assert.ok(one.includes("- line 3: ## Only (has text of its own)"), "a lone heading is no title");
});

test("a deepen helper reads its section's span, gets the scorer's note and the risk profile, states the gap it closes, and proposes old_values for the fold's drift grep", () => {
  const p = promptAmendment(CTX, { agent: "repo-research-analyst", agentFile: "C:/ce/agents/repo-research-analyst.md", scope: "patterns", line: 61, index: INDEX, triggers: "test scenarios name no inputs", depth: "Deep", risk: ["security", "parity"] }).prompt;
  assert.ok(p.includes("YOUR AGENT FILE: C:/ce/agents/repo-research-analyst.md (Scope: patterns)\nRead it first"));
  assert.ok(p.includes("THE SECTION: \"U1. Parser\", lines 61 to 139 of the plan."));
  assert.ok(p.includes("the scorer found these problems in it: test scenarios name no inputs"));
  assert.ok(p.includes("THE PLAN'S DEPTH AND RISK: Deep; high-risk signals: security, parity."));
  assert.match(p, /the gap it closes \(the problem above that it answers, with the plan line it rests on\)/);
  assert.match(p, /old_values \(up to three exact phrases the change replaces, at least 3 characters each/);
  assert.match(p, /P1 when it changes a decision or a unit, P2 otherwise/);
  assert.match(p, /grounded in this repo first/);
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

test("the learnings researcher gets this repo's lesson roots and the external researchers a focus, in research and in the deepen alike; no other agent takes either", () => {
  const learnings = { insights: "C:/repo/projects/x/docs/insights", memory: "C:/home/.claude/projects/C--repo/memory" };
  const amend = (over) => promptAmendment(CTX, { agent: "architecture-strategist", agentFile: null, line: 60, index: INDEX, triggers: "t", depth: "Standard", risk: [], ...over });
  const research = (over) => promptResearch(CTX, { agent: "repo-research-analyst", agentFile: null, dossier: "C:/runs/research/r.md", ...over });
  for (const [where, build] of [["research", research], ["deepen", amend]]) {
    const l = build({ agent: "learnings-researcher", learnings }).prompt;
    assert.ok(l.includes(`WHERE LEARNINGS LIVE: this repo keeps its lessons in ${learnings.insights} and in the memory folder ${learnings.memory}.`), `${where}: no lesson roots`);
    assert.match(l, /never a fixed docs\/solutions path/);
    assert.throws(() => build({ agent: "learnings-researcher" }), /needs learnings/, `${where}: a learnings researcher with no roots`);
    assert.throws(() => build({ agent: "git-history-analyzer", learnings }), /for the learnings researcher only/, `${where}: roots for another agent`);
    for (const agent of ["best-practices-researcher", "framework-docs-researcher", "web-researcher"]) {
      const p = build({ agent, focus: "CSV dialects spreadsheet tools read" }).prompt;
      assert.ok(p.includes("outside sources first, on this focus: CSV dialects spreadsheet tools read."), `${where}: ${agent} has no focus`);
      assert.match(p, /Use the repo only to read the versions in use or to check how an outside answer fits it\./);
      // search_with_grounding takes a query and returns Gemini's cited summary: it reads no chosen
      // page, so curl is named as the fetch tool and a summary-only claim is marked (R4-21).
      assert.ok(p.includes("Search with gemini-grounding's search_with_grounding (load it with ToolSearch): it returns Gemini's cited summary, not the pages. Read a chosen page with curl -sL --max-time 15, which this prompt names as the web-fetch tool your agent file asks for, over its rule that a generic command is not one. Cite a URL as read only when you fetched it, and mark a claim that rests on a grounded summary alone."), `${where}: ${agent} has the wrong web tool line`);
      assert.doesNotMatch(p, /reads the pages/);
      assert.doesNotMatch(p, /grounded in this repo first/, `${where}: ${agent} is told repo first`);
      // Each builder says how outside research that could not run comes back, in a field its own
      // schema has (R4-19): research's gist, the deepen's outside_ran; never the other's, never overflow.
      if (where === "research") {
        assert.ok(p.includes("When outside research could not run (no web tool answered), the gist opens with \"outside research could not run:\" and the reason."), `${where}: ${agent}`);
        assert.doesNotMatch(p, /outside_ran|in overflow/);
        assert.throws(() => build({ agent }), /focus/, `${where}: ${agent} with no focus`);
      } else {
        assert.ok(p.includes("Set outside_ran true only when a web search ran and every page you cite as read was fetched; when outside research cannot run (no web tool answers), set it false and propose only what the repo supports."), `${where}: ${agent}`);
        assert.doesNotMatch(p, /gist opens|could not run" in overflow/);
        // An update run records no external note, so the deepen's external helper needs no focus: the
        // section's problems are its focus, and the job stays outside-first (R4-18).
        for (const ctx of [CTX, UPD]) {
          const bare = promptAmendment(ctx, { agent, agentFile: null, line: 60, index: INDEX, triggers: "t", depth: "Standard", risk: [] }).prompt;
          assert.ok(bare.includes("YOUR JOB: research what would close each problem in outside sources first, on the section's problems above. Use the repo only to read the versions in use or to check how an outside answer fits it."), `${where}: ${agent} with no focus`);
          assert.match(bare, /Set outside_ran true only when/);
          assert.doesNotMatch(bare, /grounded in this repo first|on this focus/);
        }
      }
    }
    assert.throws(() => build({ agent: "git-history-analyzer", focus: "f" }), /focus is for the external researchers only/, `${where}: a focus for another agent`);
    assert.doesNotMatch(build({ agent: "git-history-analyzer" }).prompt, /outside sources first|WHERE LEARNINGS LIVE/);
  }
});

test("a verifier takes one refuter angle and asks real, material, new, severity and the fix as separate questions, worded for a finding or an amendment; an amendment's verifier sees the section and why it was picked", () => {
  const item = { title: "U2 writes floats", section: "U2. Writer", line: 141 };
  for (let angle = 0; angle < PROMPT_REFUTER_ANGLES.length; angle++) {
    const p = promptVerifier(CTX, { item, kind: "finding", angle }).prompt;
    assert.ok(p.includes(`YOUR REFUTER ANGLE: ${PROMPT_REFUTER_ANGLES[angle]}`));
    for (const other of PROMPT_REFUTER_ANGLES.filter((_, i) => i !== angle)) assert.ok(!p.includes(other), "a verifier got two angles");
    assert.ok(p.includes(`THE FINDING (JSON): ${JSON.stringify(item)}`));
    for (const q of ["- real:", "- material:", "- new:", "- corrected_severity:", "- fix_is_correct:"]) assert.ok(p.includes(q), `no ${q}`);
    assert.match(p, /Default real=false when you cannot confirm it/);
    assert.doesNotMatch(p, /THE SECTION IT AMENDS/);
  }
  const a = promptVerifier(CTX, { item, kind: "amendment", angle: 1, line: 140, index: INDEX, triggers: "the writer's rounding is unstated" }).prompt;
  assert.ok(a.includes("THE PROPOSED AMENDMENT (JSON)"));
  assert.ok(a.includes("THE SECTION IT AMENDS: \"U2. Writer\", lines 140 to 299 of the plan.\nWHY IT WAS PICKED: the scorer found these problems in it: the writer's rounding is unstated"));
  assert.match(a, /- real: the gap the amendment states exists \(read the section's lines\), and its evidence holds in source\./);
  assert.match(a, /- corrected_severity: P1 when the change alters a decision or a unit, P2 otherwise/);
  assert.throws(() => promptVerifier(CTX, { item, kind: "amendment", angle: 1 }), /section index/);
  assert.throws(() => promptVerifier(CTX, { item, kind: "amendment", angle: 1, line: 140, index: INDEX }), /triggers/);
  assert.throws(() => promptVerifier(CTX, { item, kind: "finding", angle: 0, triggers: "t" }), /only for an amendment/);
  assert.throws(() => promptVerifier(CTX, { item, kind: "finding", angle: 3 }), /angle is an index/);
  assert.throws(() => promptVerifier(CTX, { item, kind: "vote", angle: 0 }), /kind is "finding" or "amendment"/);
  assert.throws(() => promptVerifier(CTX, { item: null, kind: "finding", angle: 0 }), /to verify is required/);
});

test("a research helper writes one dossier and returns a gist; a check seat writes nothing", () => {
  const p = promptResearch(CTX, { agent: "repo-research-analyst", agentFile: "C:/ce/agents/repo-research-analyst.md", dossier: "C:/runs/research/repo.md" }).prompt;
  assert.ok(p.includes("Write exactly one file, your dossier at C:/runs/research/repo.md; create, edit or delete no other file."));
  assert.doesNotMatch(p, /Create, edit or delete no file anywhere/);
  assert.match(p, /grounded in this repo first and in outside sources only where the repo cannot answer/);
  assert.throws(() => promptResearch(CTX, { agent: "web-researcher", agentFile: null, focus: "f", dossier: "d.md" }), /absolute path/);
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

test("the lens picks read only the three conditional lenses, judge them from what the plan's named code paths touch, keep the always-on seats, and never take depth.md's lite or full choice", () => {
  for (const personaSelection of ["C:/ce/persona-selection.md", null]) {
    const p = promptLensPicks({ plan: CTX.plan, personaSelection }).prompt;
    assert.match(p, /Judge each signal from the plan's text and from what the files and code paths it names actually do: open those paths and read enough to see what they touch, never the rest of the repository\./);
    assert.match(p, /Reading or showing ordinary, non-sensitive data, storage churn, or a non-sensitive endpoint is not a signal on its own\./);
    assert.match(p, /Coherence, feasibility, scope-guardian and the adversary always run here, whatever the file says: never use depth\.md's choice between a lite and a full review, and never drop an always-on seat\./);
    assert.match(p, /key lenses/);
  }
  assert.match(promptLensPicks({ plan: CTX.plan, personaSelection: "C:/ce/persona-selection.md" }).prompt, /Use only its activation signals for product-lens, security-lens and design-lens/);
});

test("a title row never reaches a deepen helper: promptSpan refuses the title line, for the helper and its verifiers alike", () => {
  assert.throws(() => promptAmendment(CTX, { agent: "architecture-strategist", agentFile: null, line: 1, index: INDEX, triggers: "t", depth: "Standard", risk: [] }), /line 1 is the plan's title/);
  assert.throws(() => promptVerifier(CTX, { item: { title: "x" }, kind: "amendment", angle: 0, line: 1, index: INDEX, triggers: "t" }), /line 1 is the plan's title/);
  // With two top-level headings there is no title, and the first is a section like any other.
  const twoH1 = [{ line: 1, level: 1, heading: "Part A", own: true }, { line: 40, level: 1, heading: "Part B", own: true }];
  assert.ok(promptAmendment(CTX, { agent: "architecture-strategist", agentFile: null, line: 1, index: twoH1, triggers: "t", depth: "Standard", risk: [] }).prompt.includes("THE SECTION: \"Part A\", lines 1 to 39 of the plan."));
});

test("the premise seat's own never-a-false-positive line and the settlement rule stand in both modes; the scorer keeps the lens rule with either CE file alone; the refusals hold on each input alone", () => {
  for (const built of [promptPremise(CTX, { mode: "deepen" }), promptPremise(CTX, { mode: "check", roster: [...ALWAYS, "premise"] })]) {
    assert.ok(built.prompt.includes(`Your class is ${PROMPT_OWNS.premise}. A finding in it is never a false positive: CE's false-positive catalog entry for "pre-existing issues the document's work does not reach" does not apply to it.`));
    assert.match(built.prompt, /SETTLED DECISIONS: .*A finding against it stands at full severity when it shows the decision cannot reach its outcome under its own constraints; preferring the alternative it rejected is not a finding\./);
  }
  for (const files of [{ deepening: null, finalReview: "C:/ce/fr.md" }, { deepening: "C:/ce/dw.md", finalReview: null }]) {
    assert.match(promptScorer(CTX, { ...files, index: INDEX, deepened: false }).prompt, /THE LENS RULE: a CE file supplies your lens only/, JSON.stringify(files));
  }
  assert.doesNotMatch(promptScorer(CTX, { deepening: null, finalReview: null, index: INDEX, deepened: false }).prompt, /THE LENS RULE/);
  for (const extra of [{ line: 60 }, { index: INDEX }]) assert.throws(() => promptVerifier(CTX, { item: { title: "x" }, kind: "finding", angle: 0, ...extra }), /only for an amendment/, JSON.stringify(Object.keys(extra)));
  assert.throws(() => promptPremise(CTX, { mode: "deepen", round: 2 }), /runs beside the scorer/);
  assert.throws(() => promptPremise(CTX, { mode: "deepen", changes: EDIT }), /runs beside the scorer/);
});

test("the same inputs build the same prompt, byte for byte (a Workflow resume's cache keys on it)", () => {
  for (const ctx of [CTX, UPD]) {
    const a = everyBuilder(ctx).map(([n, b]) => [n, b.prompt, b.schema]);
    const b = everyBuilder(ctx).map(([n, b2]) => [n, b2.prompt, b2.schema]);
    assert.deepEqual(a, b);
  }
});

test("every prompt is ASCII, so a Workflow script that inlines it stays ASCII", () => {
  for (const ctx of [CTX, UPD]) {
    for (const [name, built] of everyBuilder(ctx)) {
      const bad = [...built.prompt].find((c) => c.codePointAt(0) > 127);
      assert.equal(bad, undefined, `${name} holds ${JSON.stringify(bad)}`);
    }
  }
});
