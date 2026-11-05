#!/usr/bin/env node
// THE RUN'S DETERMINISTIC DECISIONS (U2 of docs/plans/hybrid-plan-step-plan.md). Every main-loop
// decision that has one right answer lives here, run as a command, so SKILL.md keeps only the
// wiring:
//   - the first stage, and the next step for each stage's outcome (KTD5, KTD9, KTD11);
//   - the window gate before a stage starts (KTD10), read from the line the window skill prints;
//   - the seats a check round 2 or round 3 re-runs (KTD9);
//   - the receipt the plan's commit carries (R9);
//   - the named path's checks at the run's start and at its landing (KTD3, KTD23).
// Never inlined into a Workflow script (KTD1).
//
// Usage: node flow.mjs <command> <json | path to a .json file>
//   first         { update, brief }                         -> { stage }
//   next          { stage, outcome, sendBacks, changes, p0p1, open } -> { step, ... }
//   gate          { line, action, stage, planBytes, costs? } -> { go, step, ... }
//   round         { roster, changes }                       -> { seats, touchedBy }
//   receipt       { update, deepen, adversary, open, park, ce, coverage, holes, inline, strays, moved, record }
//                                                           -> the receipt's text
//   path-start    { path, update }                          -> { ok, state, ... }  (exit 1 when refused)
//   path-landing  { path, start }                           -> { ok, ... }         (exit 1 when changed)
// `gate` reads lib/stage-costs.json beside this file when the input names no costs; U6's smoke
// run commits that file.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain, usage } from "./entry.mjs";

// ---------------------------------------------------------------- the stages and their order

// The stages a run passes through, in order. "brief" runs only when no brief was given; "check-2"
// only when round 1's fold changed the plan; "check-3" only when round 2 confirmed a P0 or P1.
export const STAGES = ["brief", "research", "write", "deepen", "check-1", "check-2", "check-3"];
// Where a run ends in this session: landed, blocked (a report, never a question), or stopped at
// the window line with the next stage handed back.
export const ENDS = ["land", "blocked", "window-stop"];

// Under `update` the staged plan starts as HEAD's committed file, and research and the write
// step are skipped (KTD3); otherwise a run with no brief runs /brief on its topic first (KTD4).
export function firstStage({ update = false, brief = null } = {}) {
  if (update) return { stage: "deepen", reason: "update: the staged plan starts as HEAD's committed file, and research and the write step are skipped (KTD3)" };
  if (typeof brief === "string" && brief.trim()) return { stage: "research", reason: "a brief was given (KTD4)" };
  return { stage: "brief", reason: "no brief was given: run /brief on the topic first (KTD4)" };
}

const count = (name, v) => {
  if (!Number.isInteger(v) || v < 0) throw new Error(`flow: ${name} must be a whole number of at least 0, got ${JSON.stringify(v)}`);
  return v;
};

// The next step after a stage's outcome. A stage's fold, when it has one, has landed in the
// staged plan before this is asked (KTD9: a returned Workflow's fold always completes).
//   deepen: "blocked"       the scorer crashed twice, or read the plan short twice (KTD5, KTD7)
//           "premise-goal"  a verified premise finding against the pilot's own goal (KTD11)
//           "park"          a verified premise finding against a decision of Briggsy's (KTD11)
//           "passed"        no section scored 2 points: confidence check passed (KTD5)
//           "deepened"      the selected sections were researched, verified and folded
//   check-1: "done" with `changes`, how many changes its fold applied
//   check-2: "done" with `p0p1`, how many P0 or P1 findings it confirmed (each one folded)
//   check-3: "done" with `open`, how many P0 or P1 findings still stand after it
//   brief, research, write: "done"
export function nextStep({ stage, outcome, sendBacks = 0, changes, p0p1, open } = {}) {
  count("sendBacks", sendBacks);
  const go = (step, reason, extra = {}) => ({ step, reason, sendBacks, ...extra });
  const want = (allowed) => {
    if (!allowed.includes(outcome)) throw new Error(`flow: ${stage} has no outcome ${JSON.stringify(outcome)} (one of: ${allowed.join(", ")})`);
  };
  switch (stage) {
    case "brief":
      want(["done"]);
      return go("research", "the brief is in hand (KTD4)");
    case "research":
      want(["done"]);
      return go("write", "the dossiers are written; write the staged plan (KTD4)");
    case "write":
      want(["done"]);
      return go("deepen", "the staged plan is written; the premise seat and the scorer run next (KTD5)");
    case "deepen":
      want(["blocked", "premise-goal", "park", "passed", "deepened"]);
      if (outcome === "blocked") return go("blocked", "the deepen could not score the plan: a crashed or short-reading scorer never reads as passed (KTD5, KTD7)");
      if (outcome === "premise-goal") {
        return sendBacks === 0
          ? go("write", "a verified premise finding against the pilot's own goal sends the plan back to the write step once (KTD11)", { sendBacks: 1 })
          : go("blocked", "a second verified premise finding against the pilot's own goal: write and premise must not loop (KTD11)");
      }
      if (outcome === "park") return go("deepen", "a verified premise finding against a decision of Briggsy's parks; the deepen relaunches without the premise seat, carrying the recorded scores (KTD5, KTD11)", { skipPremise: true, parked: true });
      if (outcome === "passed") return go("check-1", "confidence check passed: no section to deepen (KTD5)", { deepen: "passed" });
      return go("check-1", "the deepen's fold has landed; check round 1 re-reads every deepened section (KTD9)", { deepen: "deepened" });
    case "check-1":
      want(["done"]);
      return count("changes", changes) > 0
        ? go("check-2", `round 1's fold applied ${changes} change${changes === 1 ? "" : "s"}: round 2 re-checks them (KTD9)`)
        : go("land", "round 1's fold changed nothing, so there is nothing for a round 2 to re-check (KTD9)", { open: 0 });
    case "check-2":
      want(["done"]);
      return count("p0p1", p0p1) > 0
        ? go("check-3", `round 2 confirmed ${p0p1} P0 or P1 finding${p0p1 === 1 ? "" : "s"}: a narrow round 3 on each fix alone (KTD9)`)
        : go("land", "round 2 confirmed no P0 or P1 (KTD9)", { open: 0 });
    case "check-3":
      want(["done"]);
      return count("open", open) > 0
        ? go("land", `${open} P0 or P1 still stand after round 3: the plan lands as "checked, ${open} P0/P1 open" and the build waits (KTD9)`, { open })
        : go("land", "round 3 cleared every fix it re-checked (KTD9)", { open: 0 });
    default:
      throw new Error(`flow: no stage ${JSON.stringify(stage)} (one of: ${STAGES.join(", ")})`);
  }
}

// ---------------------------------------------------------------- the window gate (KTD10)

const DASH = "—";
const READING = new RegExp(`^Context( \\(TEST ${DASH} WINDOW_TEST_TOKENS is set, not a live read\\))?: ([\\d.,\\s\\u00a0\\u202f]+) / (\\d+)M = (\\d+(?:\\.\\d+)?)% ${DASH} (.+)$`);
const TIERS = [
  [/^plenty of room$/, () => ({ tier: "room", wrapPercent: null })],
  [new RegExp(`^past the (\\d+)% warn line ${DASH} steer toward a clean milestone; [\\d.]+% to the (\\d+)% wrap line$`), (m) => ({ tier: "warn", wrapPercent: Number(m[2]) })],
  [new RegExp(`^past (\\d+)% ${DASH} no new fan-outs; [\\d.]+% to the (\\d+)% wrap line$`), (m) => ({ tier: "no-fanout", wrapPercent: Number(m[2]) })],
  [new RegExp(`^past the (\\d+)% wrap line ${DASH} wrap up and start a fresh terminal$`), (m) => ({ tier: "wrap", wrapPercent: Number(m[1]) })],
];

// One line from the window skill (projects/skills/window/window.mjs) -> what it says. The tiers
// and the wrap line are read from its words, never from a threshold of this file's own. A line
// headed "Context (TEST" counts as a reading, marked `test`, since U6's forced window stop relies
// on it. A "Context (GUESS" line is not this session's reading, and a compacted one has no live
// number yet.
export function parseWindowLine(line) {
  const text = String(line ?? "").trim();
  const m = text.match(READING);
  if (!m) {
    if (/^Context: compacted\b/.test(text)) return { kind: "compacted", line: text };
    if (/^Context \(GUESS/.test(text)) return { kind: "none", line: text, reason: "a GUESS line reads the newest log in the folder, which may be another session's" };
    return { kind: "none", line: text, reason: text ? "not a reading the window skill prints for this session" : "no window line was given" };
  }
  const tokens = Number(m[2].replace(/[^\d]/g, ""));
  const windowTokens = Number(m[3]) * 1_000_000;
  for (const [re, read] of TIERS) {
    const t = m[5].match(re);
    if (t) return { kind: "reading", test: Boolean(m[1]), tokens, windowTokens, percent: Number(m[4]), ...read(t), line: text };
  }
  return { kind: "none", line: text, reason: `the window line's tier wording is not one this gate reads ("${m[5]}"): the window skill changed, so flow.mjs must learn its new words` };
}

// The percent the window skill would print for a token total, in tenths, by its own expression
// in its own order: (total / window) * 1000, rounded. The other order, (total * 1000) / window,
// rounds differently at 12 totals up to 1M (500,500 the first).
const shownTenths = (tokens, windowTokens) => Math.round((tokens / windowTokens) * 1000);

// Checks a stage-costs table: { <stage>: { cost, planBytes } }. `cost` is the stage's measured
// main-loop cost in tokens, launch to landed fold; `planBytes` is the staged plan's size when it
// was measured, for a stage that reads or edits the staged plan (the write, every fold), or null
// for one whose cost does not grow with the plan.
export function checkCosts(costs) {
  if (!costs || typeof costs !== "object" || Array.isArray(costs)) throw new Error("flow: stage costs must be an object keyed by stage");
  for (const [stage, e] of Object.entries(costs)) {
    if (!STAGES.includes(stage)) throw new Error(`flow: stage costs name no stage ${JSON.stringify(stage)}`);
    if (!e || !Number.isInteger(e.cost) || e.cost < 0) throw new Error(`flow: ${stage}'s cost must be a whole number of tokens`);
    if (e.planBytes !== null && (!Number.isInteger(e.planBytes) || e.planBytes < 1)) throw new Error(`flow: ${stage}'s planBytes must be a whole number of bytes, or null for a cost that does not grow with the plan`);
  }
  return costs;
}

// A stage's cost for the staged plan as it is now: a stage that reads or edits the plan scales by
// the plan's size over the size it was measured at, rounded up, so a Deep plan is not judged by a
// small plan's cost.
export function stageCost(costs, stage, planBytes) {
  const e = checkCosts(costs)[stage];
  if (!e) return null;
  if (e.planBytes === null) return e.cost;
  if (!Number.isInteger(planBytes) || planBytes < 1) throw new Error(`flow: ${stage}'s cost grows with the plan, so the gate needs the staged plan's size in bytes`);
  return Math.floor((e.cost * planBytes + e.planBytes - 1) / e.planBytes);
}

// The gate before a stage starts, or after a returned Workflow (action "fold"). A returned
// Workflow's fold always completes. Below the no-new-fan-out tier a stage starts; at that tier it
// starts only when its measured cost, scaled to the plan, keeps the next reading under the wrap
// line, and a stage with no measurement does not start; at the wrap tier, or on a held start,
// the run stops at that boundary, lands nothing and hands back the stage (KTD10, KTD23).
export function stageGate({ line, action = "start", stage, planBytes, costs = {} } = {}) {
  if (action === "fold") return { go: true, step: "fold", reason: "a returned Workflow's fold always completes (KTD10)" };
  if (action !== "start") throw new Error(`flow: the gate's action is "start" or "fold", got ${JSON.stringify(action)}`);
  if (!STAGES.includes(stage)) throw new Error(`flow: no stage ${JSON.stringify(stage)} (one of: ${STAGES.join(", ")})`);
  checkCosts(costs);
  const r = parseWindowLine(line);
  const hold = (reason, extra = {}) => ({ go: false, step: "window-stop", handBack: stage, reason, ...extra });
  if (r.kind === "compacted") return { go: false, step: "reread", reason: "the session compacted since its last measured turn: run /window again after one more tool call (the window skill's own rule)", reading: r };
  if (r.kind === "none") return hold(`no window reading for this session: ${r.reason}`, { reading: r });
  const base = { reading: r, test: r.test };
  if (r.tier === "room" || r.tier === "warn") return { go: true, step: stage, reason: `${r.percent}%: below the no-new-fan-out line`, ...base };
  if (r.tier === "wrap") return hold(`${r.percent}%: past the ${r.wrapPercent}% wrap line`, base);
  const cost = stageCost(costs, stage, planBytes);
  if (cost === null) return hold(`${r.percent}%: past the no-new-fan-out line, and ${stage} has no measured main-loop cost (lib/stage-costs.json), so it does not start`, base);
  const after = r.tokens + cost;
  const shown = shownTenths(after, r.windowTokens);
  const under = shown < r.wrapPercent * 10;
  const why = `${r.percent}% plus ${stage}'s measured ${cost.toLocaleString("en-US")} tokens reads ${(shown / 10).toFixed(1)}%`;
  return under
    ? { go: true, step: stage, reason: `${why}, under the ${r.wrapPercent}% wrap line`, cost, ...base }
    : hold(`${why}, at or past the ${r.wrapPercent}% wrap line`, { cost, ...base });
}

// ---------------------------------------------------------------- check rounds 2 and 3 (KTD9)

const CHANGE_KINDS = ["edit", "add", "delete"];

// The seats a round re-runs: coherence, plus every running seat whose claim class one of the
// round's changes touched, in the roster's order. A deletion is a change like any other. Each
// change names the seats whose claim classes it touched, by their keys in `roster` (the seats this
// run's round 1 ran). Round 3 passes one fix alone.
export function roundSeats({ roster, changes } = {}) {
  if (!Array.isArray(roster) || roster.length === 0) throw new Error("flow: a round needs the run's roster of seat keys");
  if (new Set(roster).size !== roster.length) throw new Error("flow: the roster names a seat twice");
  if (!roster.includes("coherence")) throw new Error("flow: the roster has no coherence seat, which every round re-runs (KTD6, KTD9)");
  if (!Array.isArray(changes)) throw new Error("flow: changes must be a list of { id, kind, classes }");
  const touchedBy = {};
  for (const [i, c] of changes.entries()) {
    const id = c && typeof c.id === "string" && c.id.trim() ? c.id : null;
    if (!id) throw new Error(`flow: change ${i + 1} has no id`);
    if (!CHANGE_KINDS.includes(c.kind)) throw new Error(`flow: change ${id} has kind ${JSON.stringify(c.kind)} (one of: ${CHANGE_KINDS.join(", ")})`);
    if (!Array.isArray(c.classes)) throw new Error(`flow: change ${id} names no classes list`);
    for (const seat of c.classes) {
      if (!roster.includes(seat)) throw new Error(`flow: change ${id} touches ${JSON.stringify(seat)}, which is not a seat in this run's roster (${roster.join(", ")})`);
      (touchedBy[seat] ??= []).push(id);
    }
  }
  const seats = ["coherence", ...roster.filter((s) => s !== "coherence" && touchedBy[s])];
  return { seats, touchedBy };
}

// ---------------------------------------------------------------- the receipt (R9)

export const CLASSES = [
  ["premise", "premise"],
  ["reach", "reach"],
  ["blast-radius", "blast radius"],
  ["test-vacuity", "test vacuity"],
];
// KTD6: only reach and vacuity are skipped, and only on a plan with no code.
const SKIPPABLE = ["reach", "test-vacuity"];

function coverageOf(key, label, c) {
  const forms = c && typeof c === "object" ? ["verified", "nothing", "skipped", "hole"].filter((f) => c[f] !== undefined) : [];
  if (forms.length !== 1) throw new Error(`flow: the receipt's ${label} coverage needs exactly one of verified, nothing, skipped or hole: never silence (R9)`);
  const [form] = forms;
  if (form === "verified") {
    if (!Array.isArray(c.verified) || c.verified.length === 0) throw new Error(`flow: ${label}'s verified findings must be a non-empty list of ids; with none, record "nothing found"`);
    return `${label}: ${c.verified.length} verified (${c.verified.join(", ")})`;
  }
  if (form === "nothing") return `${label}: nothing found`;
  if (form === "skipped") {
    if (!SKIPPABLE.includes(key)) throw new Error(`flow: ${label} is never skipped; only reach and test vacuity skip, on a plan with no code (KTD6)`);
    if (typeof c.skipped !== "string" || !c.skipped.trim()) throw new Error(`flow: a skipped ${label} names its reason`);
    return `${label}: skipped: ${c.skipped.trim()}`;
  }
  return `${label}: no result (a coverage hole)`;
}

const listOr = (items, none, fmt) => (items.length ? items.map(fmt).join("; ") : none);

// The receipt the plan's commit carries, its one home (R9). The plan body carries none of it.
export function receipt(r = {}) {
  if (!["deepened", "passed"].includes(r.deepen)) throw new Error(`flow: deepen is "deepened" or "passed", got ${JSON.stringify(r.deepen)}`);
  if (typeof r.adversary !== "boolean") throw new Error("flow: adversary must say whether an adversary returned (KTD9: an absent one makes the check incomplete)");
  const open = count("open", r.open ?? 0);
  const verb = r.update ? "updated" : "planned";
  const deepened = r.deepen === "deepened";
  let ran = r.adversary
    ? deepened ? `${verb}, deepened and checked` : `${verb}, confidence check passed, checked`
    : deepened ? `${verb}, deepened, check incomplete: no adversary` : `${verb}, confidence check passed, check incomplete: no adversary`;
  if (open > 0) ran += `, ${open} P0/P1 open`;
  const lines = [ran];
  if (r.park !== undefined && r.park !== null) {
    if (typeof r.park !== "string" || !r.park.trim()) throw new Error("flow: a park is one paste-ready question");
    lines.push(`parked: ${r.park.trim()}`);
  }
  if (!Array.isArray(r.ce) || r.ce.length === 0) throw new Error("flow: the receipt names every CE resolution the run used, with the stages each served (KTD2)");
  lines.push(
    `CE: ${r.ce
      .map((e) => {
        if (!Array.isArray(e.stages) || e.stages.length === 0) throw new Error("flow: each CE resolution names the stages it served");
        if (e.commit !== null && !(typeof e.commit === "string" && /^[0-9a-f]{7,40}$/.test(e.commit))) throw new Error(`flow: a CE commit is a git sha, or null for "CE absent"; got ${JSON.stringify(e.commit)}`);
        return `${e.commit ?? "CE absent"} (${e.stages.join(", ")})`;
      })
      .join("; ")}`,
  );
  const cov = r.coverage ?? {};
  const unknown = Object.keys(cov).filter((k) => !CLASSES.some(([key]) => key === k));
  if (unknown.length) throw new Error(`flow: the receipt's coverage names no class ${unknown.join(", ")}`);
  lines.push(`coverage: ${CLASSES.map(([key, label]) => coverageOf(key, label, cov[key])).join("; ")}`);
  const holes = r.holes ?? [];
  lines.push(`coverage holes: ${listOr(holes, "none", (h) => {
    if (!h || typeof h.seat !== "string" || typeof h.missed !== "string") throw new Error("flow: a coverage hole names its seat and what it missed");
    return `${h.seat} (${h.missed}, resumed ${count("resumes", h.resumes)} time${h.resumes === 1 ? "" : "s"})`;
  })}`);
  lines.push(`seats without their CE file: ${listOr(r.inline ?? [], "none", (s) => `${s.seat} (${s.file})`)}`);
  lines.push(`stray files deleted: ${listOr(r.strays ?? [], "none", (p) => p)}`);
  if (r.moved) {
    const cited = r.moved.cited ?? [];
    const changed = count("moved.changed", r.moved.changed);
    lines.push(`project moved during the run: ${changed} file${changed === 1 ? "" : "s"} changed, ${cited.length} the plan cites${cited.length ? ` (${cited.join(", ")})` : ""}`);
  }
  if (typeof r.record !== "string" || !r.record.trim()) throw new Error("flow: the receipt names the run record's path");
  lines.push(`run record: ${r.record.trim()}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------- the named path (KTD3, KTD23)

const gitOut = (cwd, args) => {
  try {
    return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, MSYS_NO_PATHCONV: "1" } }).trim();
  } catch {
    return null;
  }
};

// The facts KTD3's checks read about a named plan path: where it sits in its repository and
// project, and its state in git. Reads the disk and git; the checks below are pure.
export function pathFacts(planPath, { cwd = process.cwd() } = {}) {
  const given = resolve(cwd, String(planPath));
  let dir = dirname(given);
  while (!existsSync(dir) && dirname(dir) !== dir) dir = dirname(dir);
  // The long, real form of the part that exists, so a path given through an 8.3 short name or a
  // junction compares against git's top level, which git reports in its real form.
  const path = join(realpathSync.native(dir), relative(dir, given));
  const top = gitOut(dir, ["rev-parse", "--show-toplevel"]);
  const facts = { path, gitRoot: null, inside: false, rel: null, projectRel: null, projectRoot: null, projectExists: false, plansFolder: null, exists: false, isFile: false, tracked: false, headBlob: null, worktreeBlob: null, dirty: false };
  if (!top) return facts;
  facts.gitRoot = resolve(top);
  const rel = relative(facts.gitRoot, path);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return facts;
  facts.inside = true;
  facts.rel = rel.split(sep).join("/");
  const segs = facts.rel.split("/");
  let at = -1;
  for (let i = 0; i + 2 < segs.length; i++) if (segs[i] === "docs" && segs[i + 1] === "plans") at = i;
  if (at >= 0) {
    facts.projectRel = segs.slice(0, at).join("/");
    facts.projectRoot = join(facts.gitRoot, ...segs.slice(0, at));
    facts.projectExists = existsSync(facts.projectRoot) && statSync(facts.projectRoot).isDirectory();
    facts.plansFolder = join(facts.projectRoot, "docs", "plans");
  }
  facts.exists = existsSync(path);
  facts.isFile = facts.exists && statSync(path).isFile();
  facts.tracked = gitOut(facts.gitRoot, ["ls-files", "--error-unmatch", "--", facts.rel]) !== null;
  facts.headBlob = gitOut(facts.gitRoot, ["rev-parse", "--verify", "--quiet", `HEAD:${facts.rel}`]);
  facts.worktreeBlob = facts.isFile ? gitOut(facts.gitRoot, ["hash-object", "--", facts.rel]) : null;
  facts.dirty = Boolean(gitOut(facts.gitRoot, ["status", "--porcelain", "--untracked-files=all", "--", facts.rel]));
  return facts;
}

// The part of the facts the run record keeps as the named path's state at the start (KTD10).
const stateOf = (f) => ({ path: f.path, rel: f.rel, exists: f.exists, tracked: f.tracked, headBlob: f.headBlob, worktreeBlob: f.worktreeBlob, dirty: f.dirty });

const describe = (s) => {
  if (!s.exists && !s.tracked) return "absent";
  if (!s.exists) return `deleted from the working tree but committed at blob ${s.headBlob}`;
  if (!s.tracked) return `an untracked file (blob ${s.worktreeBlob})`;
  return s.dirty ? `committed at blob ${s.headBlob}, with uncommitted changes (working blob ${s.worktreeBlob})` : `committed at blob ${s.headBlob}, clean`;
};

// KTD3 at the run's start. The path must be a .md file inside a project's own docs/plans/ tree,
// never the monorepo root's; it must be absent, or, under `update`, equal to HEAD's committed
// file; and a path with uncommitted changes refuses even under `update`.
export function startCheck(f, { update = false } = {}) {
  const no = (reason) => ({ ok: false, reason, state: f.inside ? stateOf(f) : null });
  if (!f.gitRoot) return no(`${f.path} is not inside a git repository`);
  if (!f.inside) return no(`${f.path} is outside the repository at ${f.gitRoot}`);
  if (!f.rel.toLowerCase().endsWith(".md")) return no(`${f.rel}: a plan is a .md file`);
  if (f.projectRel === null) return no(`${f.rel} is not inside a project's docs/plans/ folder`);
  if (f.projectRel === "") return no(`${f.rel} is in the repository root's docs/plans/: name a path inside a project's own docs/plans/ (KTD3)`);
  if (!f.projectExists) return no(`${f.rel}: there is no project folder at ${f.projectRel}`);
  if (f.exists && !f.isFile) return no(`${f.rel} is a folder, not a plan file`);
  if (f.dirty) return no(`${f.rel} has uncommitted changes (${describe(f)}): commit or discard them first; this refuses even under update (KTD3)`);
  if (!update && (f.exists || f.tracked)) return no(`${f.rel} already exists (${describe(f)}): a new plan needs an absent path; to deepen and check this one, pass update (KTD3)`);
  if (update && !(f.tracked && f.exists && f.headBlob && f.worktreeBlob === f.headBlob)) return no(`${f.rel} is ${describe(f)}: update needs the plan committed at HEAD (KTD3)`);
  return { ok: true, reason: update ? "update: the plan is committed at HEAD and clean" : "the path is absent, inside a project's docs/plans/", state: stateOf(f), projectRoot: f.projectRoot, createPlansFolder: !existsSync(f.plansFolder) };
}

// KTD3 again at landing (KTD23): the named path must be in the state the run's start recorded. A
// path that changed between start and landing stops the landing, naming both states.
export function landingCheck(start, f) {
  if (!start || typeof start !== "object") throw new Error("flow: the landing check needs the state the run's start recorded");
  if (!f.inside) return { ok: false, reason: `${f.path} is no longer inside a repository` };
  const now = stateOf(f);
  const same = ["exists", "tracked", "headBlob", "worktreeBlob", "dirty"].every((k) => (start[k] ?? null) === (now[k] ?? null));
  return same
    ? { ok: true, reason: `the named path is as the run's start recorded it: ${describe(now)}`, state: now }
    : { ok: false, reason: `the named path changed since the run started: at the start ${describe(start)}; now ${describe(now)}. The landing stops (KTD3)`, start, state: now };
}

// ---------------------------------------------------------------- the command

function readInput(arg) {
  if (arg === undefined) return undefined;
  const text = arg.trim().startsWith("{") ? arg : readFileSync(arg, "utf8");
  return JSON.parse(text);
}

const COMMANDS = {
  first: (i) => firstStage(i),
  next: (i) => nextStep(i),
  gate: (i) => {
    const file = join(dirname(fileURLToPath(import.meta.url)), "stage-costs.json");
    const costs = i.costs ?? (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {});
    return stageGate({ ...i, costs });
  },
  round: (i) => roundSeats(i),
  receipt: (i) => ({ text: receipt(i) }),
  "path-start": (i) => startCheck(pathFacts(i.path), { update: i.update === true }),
  "path-landing": (i) => landingCheck(i.start, pathFacts(i.path)),
};

if (isMain(import.meta.url)) {
  const [command, arg] = process.argv.slice(2);
  if (!command || !COMMANDS[command] || arg === undefined) usage(`node flow.mjs <${Object.keys(COMMANDS).join(" | ")}> <json | path to a .json file>`);
  try {
    const out = COMMANDS[command](readInput(arg));
    if (command === "receipt") console.log(out.text);
    else console.log(JSON.stringify(out, null, 1));
    process.exit(out.ok === false ? 1 : 0);
  } catch (e) {
    console.error(`flow: ${e.message.replace(/^flow: /, "")}`);
    process.exit(1);
  }
}
