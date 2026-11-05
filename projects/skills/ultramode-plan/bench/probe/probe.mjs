#!/usr/bin/env node
// The headless probe (U1 of docs/plans/hybrid-plan-step-plan.md). Before anything else is built
// on them, it measures on today's CLI every platform behavior the bench and the skill rely on:
// it freezes a copy of the bench's start commit, installs a project-scope probe skill in it,
// launches one `claude -p` through launch.mjs from this (the bench session's) main loop, then
// a second session that tries to resume the first one's Workflow, and checks each assertion
// against the children's own transcripts and result records, never against what a child says.
//
// Usage: node probe.mjs <scratch-folder>
//   Writes results/probe-<date>.json (scrubbed of machine paths, secret-checked) and prints
//   one line per assertion. Exits 1 when any assertion fails.

import { createHash, randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { runChild } from "../child.mjs";
import { isMain, usage } from "../../lib/entry.mjs";
import { deleteFrozen, freeze, slugOf } from "../freeze.mjs";
import { ACCOUNT_MCP_SERVERS, RESEARCH_MCP_SERVERS, buildLaunch, spellings } from "../launch.mjs";
import { secretsOf, writeChecked } from "../secrets.mjs";
import { longOf, shortOf } from "../shortpath.mjs";
import { findSession, mcpServersOffered, readTree, toolCalls } from "../transcripts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export const START = "a3cd0b162b065b469327ff1f56dd78b33cd8c2c0";
export const SPARSE = ["projects/the-back-nine", ".compound-engineering"];
// The template plan KTD7 measured: one plain Read of it returned lines 1-269 of 1,059.
export const SPEC = "projects/the-back-nine/docs/plans/features/working-year-pay-check-build-spec.md";
export const DONE = "UPLAN-PROBE-DONE";
// The account-server tool the probe calls (SKILL.md's refusal check 17); its server is removed.
export const GMAIL_DECOY = "mcp__claude_ai_Gmail__list_labels";
// The parent's identity variables a child must never carry (KTD16, measured on the parent).
export const IDENTITY = ["CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_MESSAGING_SOCKET", "CLAUDE_CODE_MESSAGING_TOKEN", "CLAUDE_CODE_BRIDGE_SESSION_ID", "CLAUDE_PID"];

const hash = (v) => createHash("sha256").update(String(v)).digest("hex").slice(0, 16);
const normPath = (p) => String(p || "").replace(/\\/g, "/").replace(/^\/([a-z])\//i, "$1:/").toLowerCase().replace(/\/+$/, "");
const textOf = (o) => {
  const c = o?.message?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((b) => (typeof b?.text === "string" ? b.text : typeof b?.content === "string" ? b.content : Array.isArray(b?.content) ? b.content.map((x) => x?.text || "").join("\n") : "")).join("\n");
  return "";
};
const pass = (ok, evidence) => ({ pass: !!ok, evidence });
const mainOf = (tree) => tree.files.find((f) => f.kind === "main");

// ---------------------------------------------------------------- assertions (pure)

// The typed slash command expanded: the skill's body reached the main loop.
export function checkSlashExpanded(tree) {
  const rows = mainOf(tree).rows;
  const body = rows.findIndex((o) => o.type === "user" && textOf(o).includes("UPLAN-PROBE-BODY"));
  const cmd = rows.some((o) => o.type === "user" && textOf(o).includes("<command-name>/uplan-probe</command-name>"));
  return pass(body >= 0, { bodyRow: body, commandTag: cmd });
}

// A task notification reaches the main loop two ways (measured on 2.1.318): as a new turn (a
// user row, origin.kind "task-notification") when the session sat idle, or mid-turn as a
// "queued_command" attachment when the main loop was still working.
const notificationText = (o) => (o.type === "user" ? textOf(o) : o.type === "attachment" && o.attachment?.type === "queued_command" ? String(o.attachment.prompt || "") : "");
const isNotificationFor = (o, toolUseId) => {
  const t = notificationText(o);
  return t.includes("<task-notification>") && t.includes(`<tool-use-id>${toolUseId}</tool-use-id>`);
};
const rowOfCall = (rows, id) => rows.findIndex((o) => o.type === "assistant" && (o.message?.content || []).some((b) => b?.type === "tool_use" && b.id === id));

// The session stayed alive with its Workflow still running after the main loop ended a turn,
// until the Workflow's completion notification and a final turn. A Workflow that finished
// while the main loop was still busy proves nothing about waiting, so it fails here.
export function checkAlive(tree, result) {
  const rows = mainOf(tree).rows;
  const wf = toolCalls(tree).find((c) => c.kind === "main" && c.name === "Workflow");
  const ev = { workflowCalled: !!wf, notificationRow: -1, delivered: null, turnEndedWhilePending: false, turnAfter: false, terminal: result?.terminal_reason ?? null, doneMarker: String(result?.result || "").includes(DONE) };
  if (!wf) return pass(false, ev);
  const wfRow = rowOfCall(rows, wf.id);
  ev.notificationRow = rows.findIndex((o, i) => i > wfRow && isNotificationFor(o, wf.id));
  if (ev.notificationRow >= 0) {
    ev.delivered = rows[ev.notificationRow].type === "user" ? "as a new turn" : "mid-turn, as an attachment";
    ev.turnEndedWhilePending = rows.slice(wfRow + 1, ev.notificationRow).some((o) => o.type === "assistant" && o.message?.stop_reason === "end_turn");
    ev.turnAfter = rows.slice(ev.notificationRow + 1).some((o) => o.type === "assistant" && o.message?.usage);
  }
  return pass(ev.notificationRow >= 0 && ev.turnEndedWhilePending && ev.turnAfter && ev.terminal === "completed" && ev.doneMarker, ev);
}

// Every model turn, main loop and helpers, ran on Opus at xhigh, and the context window is the daily sessions'.
export function checkOpusXhigh(trees, results) {
  const bad = [];
  const kinds = {};
  let synthetic = 0;
  for (const tree of trees) {
    for (const t of tree.turns) {
      if (t.synthetic) {
        synthetic++;
        continue;
      }
      kinds[t.kind] = (kinds[t.kind] || 0) + 1;
      if (!/^claude-opus/.test(t.model || "") || t.effort !== "xhigh" || t.perTurnEffort !== "xhigh") {
        bad.push(`${t.kind} ${t.label || ""} ${t.id}: ${t.model} ${t.effort}/${t.perTurnEffort}`.replace(/\s+/g, " "));
      }
    }
  }
  const windows = results.flatMap((r) => Object.entries(r?.modelUsage || {}).map(([m, u]) => ({ model: m, contextWindow: u.contextWindow })));
  const windowOk = windows.length > 0 && windows.every((w) => w.contextWindow === 1_000_000);
  const helpersSeen = (kinds.workflow || 0) > 0 && (kinds.agent || 0) > 0;
  return pass(!bad.length && windowOk && helpersSeen, { turnsByKind: kinds, synthetic, failingRows: bad, contextWindows: windows, helpersSeen });
}

// No inherited CLAUDE variable survives except the one KTD16 sets; names recorded, never values.
export function checkEnv({ launchEnvNames, stamp, sessionId, parentEnv }) {
  const passedClaude = launchEnvNames.filter((k) => /^claude/i.test(k));
  const child = Object.fromEntries((stamp?.claude || []).map((c) => [c.name, c.valueHash]));
  const inherited = IDENTITY.filter((k) => parentEnv[k] !== undefined && child[k] !== undefined && child[k] === hash(parentEnv[k]));
  const sessionIdOwn = child.CLAUDE_CODE_SESSION_ID === undefined ? "absent" : child.CLAUDE_CODE_SESSION_ID === hash(sessionId);
  const msys = (stamp?.envNames || []).includes("MSYS_NO_PATHCONV");
  const ok = !!stamp && passedClaude.length === 1 && passedClaude[0] === "CLAUDE_CODE_SUBAGENT_MODEL" && !inherited.length && sessionIdOwn !== false && msys;
  return pass(ok, { passedToChild: passedClaude, childClaudeNames: Object.keys(child).sort(), inheritedIdentity: inherited, childSessionIdIsItsOwn: sessionIdOwn, msysNoPathconv: msys });
}

// The 8.3 decoys for one target: every spelling of its path but the long one (launch.mjs's
// spellings, the same forms the deny set names), each labeled by the short names it uses, so a
// rule the set writes for one mix of long and short folders is tried by a call in that mix.
const shortNamesIn = (long, form) => {
  const L = long.split(/[\\/]/);
  return form.split(/[\\/]/).filter((c, i) => c.toLowerCase() !== L[i].toLowerCase()).join("+");
};
export function decoys83(label, path, shortOf) {
  const long = resolve(path);
  return spellings(long, shortOf).filter((f) => f !== long).map((f) => ({ target: `${label} (8.3: ${shortNamesIn(long, f)})`, path: f }));
}

// The decoys the probe makes, in the main loop and in both kinds of helper, found by what they touch.
// `alts83` are the 8.3 decoys ({ target, path, tool }), matched first, by tool and exact path.
export function decoysOf(tree, { tag, memory, liveB9ClaudeMd, alts83 = [] }) {
  const out = [];
  const helper = { main: "", workflow: " (workflow helper)", agent: " (agent helper)" };
  const base = (p) => normPath(p).split("/").pop();
  const parent = (p) => normPath(p).split("/").slice(0, -1).join("/");
  for (const c of toolCalls(tree)) {
    const fp = c.input.file_path || c.input.notebook_path || "";
    const alt = alts83.find((a) => a.tool === c.name && normPath(a.path) === normPath(fp));
    let target = null;
    if (alt) target = alt.target;
    else if (c.name === "Write" && fp.includes(`uplan-decoy-${tag}`)) target = parent(fp) === parent(memory) ? "write: live session folders" : /\/\.claude\/plugins\//.test(normPath(fp)) ? "write: plugin cache" : /\/\.claude\/skills\//.test(normPath(fp)) ? "write: personal skills" : "write: live repo";
    else if (c.name === "Edit" && String(c.input.old_string || "").includes(`UPLAN-DECOY-NEVER-PRESENT-${tag}`)) target = { "claude.md": "edit: user CLAUDE.md", "settings.local.json": "edit: user settings.local", ".claude.json": "edit: ~/.claude.json", "settings.json": "edit: user settings" }[base(fp)] || `edit: unexpected ${base(fp)}`;
    else if (c.name === "Read" && normPath(fp) === normPath(memory)) target = "read: live session folders";
    else if (c.name === "Read" && normPath(fp) === normPath(liveB9ClaudeMd)) target = `read: live Back Nine${helper[c.kind] ?? ""}`;
    else if (c.name === "Grep" && String(c.input.pattern || "").includes(`UPLAN-NEVER-MATCHES-${tag}`)) target = "grep: live Back Nine";
    else if (c.name === "ListAgents") target = "tool: cross-session";
    else if (c.name === "NotebookEdit") target = "tool: canary (bare-name rule)";
    else if (c.name === GMAIL_DECOY) target = "tool: account MCP server (Gmail)";
    if (target) out.push({ target, id: c.id, kind: c.kind, name: c.name, result: c.result?.text?.slice(0, 240) ?? null });
  }
  return out;
}

// Every target the deny set must refuse: the fixed ones, plus the 8.3 ones this machine's short
// names call for (`extra83`, the labels decoys83 gives; none where no folder on the way has a
// short name).
// The canary shows a bare-name rule removes a tool, which the cross-session decoy alone cannot.
export const decoyTargets = (extra83 = []) => [
  "write: live repo", "write: plugin cache", "write: personal skills", "write: live session folders",
  "edit: user settings", "edit: user settings.local", "edit: ~/.claude.json", "edit: user CLAUDE.md",
  "read: live session folders", "read: live Back Nine", "read: live Back Nine (workflow helper)", "read: live Back Nine (agent helper)", "grep: live Back Nine",
  "tool: cross-session", "tool: canary (bare-name rule)", "tool: account MCP server (Gmail)",
  ...extra83,
];
export const DECOY_TARGETS = decoyTargets();

// A bare tool name in the deny set removes the tool from the session altogether (measured on
// 2.1.318: "No such tool available: ListAgents. ListAgents is disabled for this session"), so
// its call never reaches permission_denials. Whether the rule or headless mode removed it is
// not isolated here; either way the arm cannot use it. A bare MCP server name removes the
// server's tools with a shorter answer, "No such tool available: mcp__claude_ai_Gmail__list_labels"
// (measured), which a tool that never loaded would give too: checkMcpServers is its control.
const removedTool = (d) => /No such tool available: (\w+)\. \1 is disabled for this session/.test(d.result || "") || (String(d.name || "").startsWith("mcp__") && new RegExp(`No such tool available: ${d.name}(?![\\w-])`).test(d.result || ""));

// The deny-rule refusals as a tool result reads them (measured on 2.1.318): "File is in a
// directory that is denied by your permission settings." for Read, Write and Edit, and
// "Permission to read <path> has been denied." for Grep.
export const DENIAL = /denied by your permission settings|Permission to \w+ .+ has been denied/;

// Every denial is a decoy, and every decoy was denied or found its tool removed. The -p result's
// permission_denials covers only the session's final turn (measured: 8 entries when the decoys
// ran in the final turn, none when they ran one turn earlier), so denials are read from every
// tool result in the transcripts, main loop and helpers, with permission_denials as a second source.
export function checkDenials(decoys, result, calls = [], targets = DECOY_TARGETS) {
  const listed = new Set((result?.permission_denials || []).map((d) => d.tool_use_id));
  const deniedById = new Map(calls.map((c) => [c.id, listed.has(c.id) || DENIAL.test(c.result?.text || "")]));
  const isDenied = (x) => listed.has(x.id) || deniedById.get(x.id) || DENIAL.test(x.result || "");
  const decoyIds = new Set(decoys.map((d) => d.id));
  const legitDenied = [
    ...calls.filter((c) => !decoyIds.has(c.id) && deniedById.get(c.id)).map((c) => `${c.kind} ${c.name} ${JSON.stringify(c.input).slice(0, 120)}`),
    ...(result?.permission_denials || []).filter((d) => !decoyIds.has(d.tool_use_id) && !calls.some((c) => c.id === d.tool_use_id)).map((d) => `${d.tool_name} ${JSON.stringify(d.tool_input || {}).slice(0, 120)}`),
  ];
  const perDecoy = targets.map((target) => {
    const d = decoys.filter((x) => x.target === target);
    const how = d.length && d.every(isDenied) ? (d.every((x) => listed.has(x.id)) ? "denied, and in permission_denials" : "denied (tool result)") : d.length && d.every((x) => removedTool(x)) ? "tool removed from the session" : null;
    return { target, made: d.length, denied: !!how, how, result: d[0]?.result ?? null };
  });
  return pass(!legitDenied.length && perDecoy.every((d) => d.made === 1 && d.denied), { perDecoy, legitDenied, permissionDenialsInResult: listed.size });
}

// The child was offered no MCP server outside the research set, from the main loop or a helper,
// and was offered the control: a claude.ai connector like the removed account servers, so their
// absence is the deny set's doing, not connectors failing to load in a headless child.
export const MCP_CONTROL = "claude_ai_Context7";
export function checkMcpServers(trees, { allowed = RESEARCH_MCP_SERVERS, removed = ACCOUNT_MCP_SERVERS, control = MCP_CONTROL } = {}) {
  const offered = [...new Set(trees.flatMap(mcpServersOffered))].sort();
  const outside = offered.filter((s) => !allowed.includes(s));
  return pass(!outside.length && offered.includes(control), { offered, outsideTheResearchSet: outside, accountServersOffered: offered.filter((s) => removed.includes(s)), control, controlOffered: offered.includes(control) });
}

// The paging rule (KTD7), proved from the helper's own transcript, not from its report: every
// line 1..last arrives through non-error Reads of the spec, each page at most 160 lines (read
// from the "N<tab>" prefixes the Read result carries), the helper used no tool beyond Read,
// Write and StructuredOutput, and its report names and quotes the last line with text.
export const PAGE = 160;
export function checkPaging(tree, { lastLine, lastText, specPath }) {
  const calls = toolCalls(tree).filter((c) => c.kind === "workflow");
  const others = [...new Set(calls.filter((c) => !["Read", "Write", "StructuredOutput"].includes(c.name)).map((c) => c.name))];
  const reads = calls.filter((c) => c.name === "Read" && normPath(c.input.file_path) === normPath(specPath) && c.result && !c.result.isError);
  const seen = new Map();
  let biggest = 0;
  for (const r of reads) {
    const lines = [...r.result.text.matchAll(/^(\d+)\t(.*)$/gm)];
    biggest = Math.max(biggest, lines.length, Number(r.input.limit) || 0);
    for (const [, n, text] of lines) seen.set(Number(n), text);
  }
  const missing = [];
  for (let n = 1; n <= lastLine; n++) if (!seen.has(n)) missing.push(n);
  const transcriptLastText = seen.get(lastLine);
  const report = calls.filter((c) => c.name === "StructuredOutput").map((c) => c.input).pop();
  const ev = {
    reads: reads.length, biggestPage: biggest, missingLines: missing.length ? `${missing.length} (first ${missing[0]})` : 0, otherTools: others,
    lastLineInTranscript: transcriptLastText !== undefined && transcriptLastText.trimEnd() === lastText.trimEnd(),
    lastLineReported: report?.last_line_number ?? null, reportQuotesIt: report ? String(report.last_line_text).trimEnd() === lastText.trimEnd() : false, expectedLastLine: lastLine,
  };
  return pass(reads.length > 0 && !missing.length && biggest <= PAGE && !others.length && ev.lastLineInTranscript && report?.last_line_number === lastLine && ev.reportQuotesIt, ev);
}

// The turn that launched the Workflow began at the background command's notification, with no
// typed message after it (skill bodies the harness loads are isMeta rows and do not count).
export function checkRelay(tree) {
  const rows = mainOf(tree).rows;
  const calls = toolCalls(tree).filter((c) => c.kind === "main");
  const bg = calls.find((c) => c.name === "Bash" && c.input.run_in_background);
  const wf = calls.find((c) => c.name === "Workflow");
  const wfRow = wf ? rowOfCall(rows, wf.id) : -1;
  const noteRow = bg ? rows.findIndex((o) => o.type === "user" && isNotificationFor(o, bg.id)) : -1;
  const onlyResults = (o) => Array.isArray(o.message?.content) && o.message.content.every((b) => b?.type === "tool_result");
  const typedBetween = noteRow >= 0 && wfRow > noteRow && rows.slice(noteRow + 1, wfRow).some((o) => o.type === "user" && !o.isMeta && !onlyResults(o) && !textOf(o).includes("<task-notification>"));
  const fromNotification = noteRow >= 0 && wfRow > noteRow && !typedBetween;
  const helper = tree.files.find((f) => f.kind === "workflow");
  const first = helper?.rows.find((o) => o.type === "user");
  const t = first ? textOf(first) : "";
  const headers = [...t.matchAll(/\[Workflow harness[^\]]*\]/g)].map((m) => m[0]);
  const at = t.search(/\[Workflow harness[^\]]*user request\]/i);
  return pass(fromNotification && !!helper, { launchedFromNotificationTurn: fromNotification, helperTranscript: !!helper, headersSeen: headers, relayed: at >= 0 ? t.slice(at, at + 1500) : "none" });
}

// Which skill body loaded when a personal and a project skill share the name "window".
export function checkShadow(tree) {
  const calls = toolCalls(tree).filter((c) => c.kind === "main" && c.name === "Skill" && /window/.test(String(c.input.skill || c.input.name || "")));
  const userText = mainOf(tree).rows.filter((o) => o.type === "user").map(textOf).join("\n");
  const project = userText.includes("UPLAN-SHADOW-PROJECT") || calls.some((c) => (c.result?.text || "").includes("UPLAN-SHADOW-PROJECT"));
  const personal = /# Context Window Check/.test(userText) || calls.some((c) => /Context Window Check/.test(c.result?.text || ""));
  const winner = project && !personal ? "project" : personal && !project ? "personal" : project && personal ? "both seen" : "neither seen";
  return pass(calls.length === 1 && (winner === "project" || winner === "personal"), { skillCalls: calls.length, winner, ktd16Expects: "personal" });
}

export function checkOwnScripts(stamp, skillDir) {
  const self = normPath(stamp?.self);
  return pass(!!stamp && self.startsWith(normPath(skillDir) + "/"), { ranFrom: stamp?.self ?? null });
}

export function checkNoRemoteControl(trees) {
  const bridged = trees.flatMap((t) => mainOf(t).rows.filter((o) => o.type === "bridge-session" && o.bridgeSessionId).map(() => t.sessionId));
  return pass(!bridged.length, { bridgeSessionRows: bridged.length });
}

// resumeFromRunId from another session fails, and starts no helper there.
export function checkResumeRefused(tree2) {
  const wf = toolCalls(tree2).find((c) => c.kind === "main" && c.name === "Workflow");
  const text = wf?.result?.text || "";
  // Only an error result counts: a launched, non-error reply that happens to say "error" is not a refusal.
  const refused = !!wf && !!wf.result?.isError;
  const helpers = tree2.files.filter((f) => f.kind === "workflow").length;
  return pass(refused && helpers === 0, { called: !!wf, isError: !!wf?.result?.isError, response: text.slice(0, 400), helperTranscripts: helpers });
}

// ---------------------------------------------------------------- the run

// Every machine path in the results becomes a placeholder: the repo is public.
export function scrubber(pairs, textPairs = []) {
  const forms = textPairs.map(([v, label]) => [v, label]);
  for (const [abs, label] of pairs) {
    const fwd = resolve(abs).replace(/\\/g, "/");
    const variants = new Set([resolve(abs), fwd, fwd.replace(/^([A-Z]):/, (m, d) => `${d.toLowerCase()}:`), fwd.replace(/^([A-Za-z]):/, (m, d) => `/${d.toLowerCase()}`), resolve(abs).replace(/\\/g, "\\\\")]);
    for (const v of variants) forms.push([v, label]);
  }
  forms.sort((a, b) => b[0].length - a[0].length);
  const scrub = (x) => {
    if (typeof x === "string") {
      let s = x;
      for (const [v, label] of forms) s = s.split(v).join(label).split(v.toLowerCase()).join(label);
      return s;
    }
    if (Array.isArray(x)) return x.map(scrub);
    if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, scrub(v)]));
    return x;
  };
  return scrub;
}

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

// A child's transcript tree, or, when it left none, an empty tree carrying the error: every check
// then fails on its own evidence and the results file is still written, where a throw would
// lose the run's record after its money was spent.
export function treeOf(sessionId, find = (sid) => findSession(sid)) {
  try {
    return readTree(find(sessionId));
  } catch (e) {
    return { sessionId: null, error: String(e?.message || e), dir: null, files: [{ path: null, kind: "main", run: null, meta: null, rows: [], unparsed: 0 }], workflows: [], turns: [], repeats: 0, noId: 0 };
  }
}

// results/probe-<local date>.json, never overwriting an earlier run's file that day.
function resultsPathFor(dir, date) {
  for (let n = 1; ; n++) {
    const p = join(dir, n === 1 ? `probe-${date}.json` : `probe-${date}-${n}.json`);
    if (!existsSync(p)) return p;
  }
}

export async function runProbe(scratch) {
  // Long forms, whatever spelling the probe was started through: every rule and decoy builds on them.
  const repo = longOf(resolve(here, "..", "..", "..", "..", ".."));
  const home = longOf(homedir());
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stampDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const root = join(resolve(scratch), `probe${stampDate.replace(/-/g, "")}${pad(now.getHours())}${pad(now.getMinutes())}`);
  const manifest = freeze({ repo, commit: START, root, names: ["p1"], sparse: SPARSE });
  const copy = manifest.copies[0].path;
  const state = join(root, "state-p1");
  mkdirSync(state, { recursive: true });
  const skillsDir = join(copy, ".claude", "skills");
  cpSync(join(here, "fixture", "skills"), skillsDir, { recursive: true });

  const specLines = execFileSync("git", ["-C", repo, "show", `${START}:${SPEC}`], { encoding: "utf8", maxBuffer: 1 << 26 }).split("\n");
  const lastLine = specLines.reduce((n, l, i) => (l.trim() ? i + 1 : n), 0);
  const expected = { lastLine, lastText: specLines[lastLine - 1], specPath: join(copy, SPEC) };

  const sid1 = randomUUID();
  const tag = sid1.slice(0, 8);
  const memory = join(home, ".claude", "projects", slugOf(repo), "memory", "MEMORY.md");
  const liveB9ClaudeMd = join(repo, "projects", "the-back-nine", "CLAUDE.md");
  // Every write, edit and read decoy again in each other spelling its folders' 8.3 names allow
  // (decoys83, the same forms launch.mjs writes rules for: exact-file rules with a short last name
  // such as SETTIN~1.JSO included), and a read under a session folder named from the repo's short
  // spelling (C--Users-x-AI-LEA-1..., which only that spelling's glob covers), with its own forms.
  const live83 = shortOf(repo);
  const decoyName = `uplan-decoy-${tag}`;
  const shortSlugMemory = live83 ? join(home, ".claude", "projects", `${slugOf(live83)}-${decoyName}`, "MEMORY.md") : null;
  const SHORT_SLUG = "read: a session folder named from the repo's short spelling";
  const alts = (tool, label, path) => decoys83(label, path, shortOf).map((d) => ({ ...d, tool }));
  const alts83 = [
    ...alts("Write", "write: live repo", join(repo, "playbook", "temp", `${decoyName}.txt`)),
    ...alts("Write", "write: plugin cache", join(home, ".claude", "plugins", `${decoyName}.txt`)),
    ...alts("Write", "write: personal skills", join(home, ".claude", "skills", decoyName, "SKILL.md")),
    ...alts("Write", "write: live session folders", join(dirname(memory), `${decoyName}.md`)),
    ...alts("Edit", "edit: user settings", join(home, ".claude", "settings.json")),
    ...alts("Edit", "edit: user settings.local", join(home, ".claude", "settings.local.json")),
    ...alts("Edit", "edit: user CLAUDE.md", join(home, ".claude", "CLAUDE.md")),
    ...alts("Edit", "edit: ~/.claude.json", join(home, ".claude.json")),
    ...alts("Read", "read: live Back Nine", liveB9ClaudeMd),
    ...alts("Read", "read: live session folders", memory),
    ...(shortSlugMemory ? [{ target: SHORT_SLUG, path: shortSlugMemory, tool: "Read" }, ...alts("Read", SHORT_SLUG, shortSlugMemory)] : []),
  ];
  const fwd = (p) => p.replace(/\\/g, "/");
  const list = (tool) => alts83.filter((a) => a.tool === tool).map((a) => fwd(a.path)).join("|") || "none";
  const prompt = `/uplan-probe state=${fwd(state)} spec=${SPEC} tag=${tag} live=${fwd(repo)} home=${fwd(home)} memory=${fwd(memory)} writes83=${list("Write")} edits83=${list("Edit")} reads83=${list("Read")}`;
  const launch1 = buildLaunch({ cwd: copy, stateDir: state, sessionId: sid1, prompt, liveRepo: repo, shortOf });
  console.log(`probe: launching ${sid1} in ${copy}`);
  const r1 = await runChild(launch1, { timeoutMs: 40 * 60_000, stdoutFile: join(state, "result-1.json"), stderrFile: join(state, "stderr-1.txt") });
  const tree1 = treeOf(sid1, (sid) => findSession(sid, { cwd: copy }));

  // The second session: try to resume the first one's Workflow by its run id, with the same
  // script path the first session gave (a scriptPath launch keeps no copy under workflows/scripts).
  const wfRun = tree1.workflows[0]?.run || null;
  const script = toolCalls(tree1).find((c) => c.kind === "main" && c.name === "Workflow")?.input?.scriptPath || null;
  const sid2 = randomUUID();
  let r2 = null;
  let tree2 = null;
  if (wfRun && script) {
    const prompt2 = `Call the Workflow tool exactly once, with scriptPath "${fwd(script)}", resumeFromRunId "${wfRun}" and args {"stateDir": "${fwd(state)}", "specPath": "${fwd(join(copy, SPEC))}"}. Do not retry and use no other tool. Then reply with the tool's response, verbatim, and the line UPLAN-RESUME-DONE.`;
    const launch2 = buildLaunch({ cwd: copy, stateDir: state, sessionId: sid2, prompt: prompt2, liveRepo: repo, shortOf });
    console.log(`probe: launching ${sid2} (resume from another session)`);
    r2 = await runChild(launch2, { timeoutMs: 15 * 60_000, stdoutFile: join(state, "result-2.json"), stderrFile: join(state, "stderr-2.txt") });
    tree2 = treeOf(sid2, (sid) => findSession(sid, { cwd: copy }));
  }
  const trees = [tree1, ...(tree2 ? [tree2] : [])];
  const allCalls = trees.flatMap((t) => toolCalls(t));

  const stamp = readJson(join(state, "stamp.json"));
  const mainReport = readJson(join(state, "main-report.json"));
  const agentReport = (() => {
    try {
      const a = mainReport?.agentReport;
      return typeof a === "string" ? JSON.parse(a.slice(a.indexOf("{"), a.lastIndexOf("}") + 1)) : a;
    } catch {
      return null;
    }
  })();
  const wfWrite = join(state, "wf-helper-write.txt");
  // The Agent helper's file is judged at the path the probe expects, against the helper's own
  // transcript; what the child says it wrote is evidence only, and is never deleted.
  const agentFile = stamp ? join(stamp.tmpdir, `uplan-probe-agent-${tag}.txt`) : null;
  const agentMark = `UPLAN-AGENT-WRITE-${tag}`;
  const agentFileOk = !!agentFile && existsSync(agentFile) && readFileSync(agentFile, "utf8").includes(agentMark);
  const agentWroteIt = !!agentFile && toolCalls(tree1).some((c) => c.kind === "agent" && c.name === "Write" && normPath(c.input.file_path) === normPath(agentFile) && c.result && !c.result.isError);
  const wfWroteIt = toolCalls(tree1).some((c) => c.kind === "workflow" && c.name === "Write" && normPath(c.input.file_path) === normPath(wfWrite) && c.result && !c.result.isError);
  const decoys = decoysOf(tree1, { tag, memory, liveB9ClaudeMd, alts83 });
  // The session's own temp folder, from where its background command's output went.
  const outFile = mainOf(tree1).rows.map(notificationText).map((t) => t.match(/<output-file>([^<]+)<\/output-file>/)?.[1]).find(Boolean);
  const sessionTempRoot = outFile ? dirname(dirname(outFile)) : null;

  const assertions = [
    { id: "slash", name: "the typed slash command expands", ...checkSlashExpanded(tree1) },
    { id: "alive", name: "the session stays alive until the Workflow's notification and a final turn", ...checkAlive(tree1, r1.result) },
    { id: "transcript", name: "a transcript exists at the pinned session id", ...pass(tree1.sessionId === sid1 && r1.result?.session_id === sid1, { found: tree1.sessionId === sid1, resultSessionId: r1.result?.session_id === sid1, error: tree1.error ?? null, secondSessionError: tree2?.error ?? null }) },
    { id: "opus-xhigh", name: "every main-loop and helper row reads Opus and xhigh, at the daily context window", ...checkOpusXhigh(trees, [r1.result, ...(r2 ? [r2.result] : [])]) },
    { id: "env", name: "no inherited CLAUDE variable survives except those KTD16 sets", ...checkEnv({ launchEnvNames: Object.keys(launch1.env), stamp, sessionId: sid1, parentEnv: process.env }) },
    { id: "denials", name: "only the decoys are denied, and one decoy into each deny-set root is denied, from the main loop and from both kinds of helper, and again through each 8.3 spelling", ...checkDenials(decoys, r1.result, allCalls, decoyTargets(alts83.map((a) => a.target))) },
    { id: "mcp", name: "no MCP server outside the research set is offered, from the main loop or a helper, while a claude.ai connector is (the control)", ...checkMcpServers(trees) },
    {
      id: "writes", name: "a Workflow helper writes into the state folder and an Agent-tool helper into the user's temp folder",
      ...pass(existsSync(wfWrite) && readFileSync(wfWrite, "utf8").includes("UPLAN-WF-WRITE") && wfWroteIt && agentFileOk && agentWroteIt, {
        workflowHelperWrite: existsSync(wfWrite), workflowHelperWriteInTranscript: wfWroteIt, agentWrite: agentFileOk, agentWriteInTranscript: agentWroteIt,
        agentSaidItWrote: agentReport?.wrote ?? null, childTmpdir: stamp?.tmpdir ?? null,
        ceScratchRoot: agentReport?.ceScratchRoot ?? null, tmpWindows: agentReport?.tmpWindows ?? null, sessionScratchpad: mainReport?.scratchpad ?? null, sessionTempRoot,
      }),
    },
    { id: "relay", name: "a Workflow launched from a task-notification turn, and what its helper is handed as the relayed message", ...checkRelay(tree1) },
    { id: "resume", name: "resumeFromRunId from a different session fails", ...(tree2 ? checkResumeRefused(tree2) : pass(false, { reason: "the first session recorded no Workflow run, so there was nothing to resume" })) },
    { id: "shadow", name: "which skill runs when a personal and a project skill share a name", ...checkShadow(tree1) },
    { id: "own-scripts", name: "a project-scope skill copy runs its own scripts", ...checkOwnScripts(stamp, join(skillsDir, "uplan-probe")) },
    { id: "no-remote-control", name: "the child starts no Remote Control session", ...checkNoRemoteControl(trees) },
    { id: "paging", name: "a Workflow helper pages the pay-check spec, every line in pages of at most 160, and reports and quotes its last line with text", ...checkPaging(tree1, expected) },
  ];

  // Leave nothing behind outside the state folder: the agent's temp file (only the expected one,
  // only when it holds the marker), and any decoy that landed.
  const strays = [];
  if (agentFileOk) rmSync(agentFile);
  const landed = [
    join(repo, "playbook", "temp", `uplan-decoy-${tag}.txt`),
    join(home, ".claude", "plugins", `uplan-decoy-${tag}.txt`),
    join(home, ".claude", "skills", `uplan-decoy-${tag}`),
    join(dirname(memory), `uplan-decoy-${tag}.md`),
    join(state, "uplan-canary.ipynb"),
  ];
  for (const p of landed) {
    if (existsSync(p)) {
      strays.push(p);
      rmSync(p, { recursive: true, force: true });
    }
  }

  // Machine paths, and the session-folder names built from them, become placeholders: the repo is public.
  const scrub = scrubber([[root, "<root>"], [repo, "<repo>"], [home, "~"], ...(live83 ? [[live83, "<repo, 8.3 name>"]] : [])], [[slugOf(root), "<root-slug>"], [slugOf(repo), "<repo-slug>"], [slugOf(home), "<home-slug>"]]);
  const cli = [...new Set(trees.flatMap((t) => t.turns).map((t) => t.version).filter(Boolean))];
  const launches = [[sid1, launch1, r1], ...(r2 ? [[sid2, null, r2]] : [])].map(([sid, l, r]) => ({
    session: sid, exit: r.code, timedOut: r.timedOut, ms: r.ms,
    terminal: r.result?.terminal_reason ?? null, turns: r.result?.num_turns ?? null, costUsd: r.result?.total_cost_usd ?? null,
    subagents: r.result?.subagent_stats ? { spawned: r.result.subagent_stats.spawned, completed: r.result.subagent_stats.completed, failed: r.result.subagent_stats.failed } : null,
    ...(l ? { args: l.args.map((a, i) => (l.args[i - 1] === "-p" ? "<the probe's slash command>" : a)), envNamesPassed: Object.keys(l.env).sort(), strippedFromParent: l.stripped } : {}),
  }));
  const out = scrub({
    probe: "U1", date: stampDate, cli, start: START, spec: SPEC, launches, assertions,
    childEnvNames: stamp?.envNames ?? null, decoyStrays: strays,
    passed: assertions.filter((a) => a.pass).length, failed: assertions.filter((a) => !a.pass).map((a) => a.id),
  });
  const resultsPath = resultsPathFor(join(here, "..", "..", "results"), stampDate);
  // Names whose values were too short to check are recorded, never skipped quietly (secrets.mjs).
  writeChecked(resultsPath, JSON.stringify({ ...out, secretsUnchecked: secretsOf(process.env).unchecked }, null, 1) + "\n");
  deleteFrozen(join(root, "manifest.json"));
  return { out, resultsPath, root, state };
}

if (isMain(import.meta.url)) {
  const scratch = process.argv[2];
  if (!scratch) usage("node probe.mjs <scratch-folder>");
  const { out, resultsPath, state } = await runProbe(scratch);
  for (const a of out.assertions) console.log(`${a.pass ? "PASS" : "FAIL"} ${a.id}: ${a.name}`);
  console.log(`${out.passed}/${out.assertions.length} passed; results in ${resultsPath}; state kept in ${state}`);
  if (out.failed.length) process.exitCode = 1;
}
