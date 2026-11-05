#!/usr/bin/env node
// Builds one headless child session's command line and environment (KTD16 of
// docs/plans/hybrid-plan-step-plan.md). It starts no session: the only thing it runs is the
// short-name lookup its caller passes in (shortOf). The probe, U6's smoke run and U7's run-arm
// all launch through it, so every child is launched one way.
//
// The settings, and why:
//   - the daily sessions' model string and xhigh effort, set on the command line;
//   - every inherited variable whose name starts with CLAUDE is stripped (the parent passes
//     on its session id, messaging socket and token, bridge session and "attended" flag),
//     then CLAUDE_CODE_SUBAGENT_MODEL=opus is set, and MSYS_NO_PATHCONV=1 so Git Bash never
//     rewrites a "/skill ..." prompt or a "/path/" argument into a Windows path;
//   - a pinned --session-id, so the transcript is found by id, never by "the newest file";
//   - permission mode auto for every arm, with --permission-prompts none: a headless child has
//     nobody to answer a prompt, so anything that would ask is denied, the same for every arm;
//   - the state folder as the one extra working directory;
//   - one deny set, identical for every arm, because the user settings allow Bash, Read and
//     Write on every path, native Windows has no sandbox, and only a deny rule stops an
//     action before it happens in every mode. Writes use Edit rules, which cover every
//     built-in tool that edits a file; Read rules cover Grep and Glob as a best effort
//     (Claude Code's permissions docs). The probe (U1) proves each root with a decoy.
//     A rule matches the path a call names in either case and with either slash, but never
//     through an 8.3 short name (measured on CLI 2.1.318), so every path rule is written in
//     each spelling its folders' short names allow (spellings below). The same set removes the
//     cross-session tools and the MCP servers that reach the user's accounts and browsers.
//
// Usage: node launch.mjs <cwd> <state-dir> <session-uuid> <prompt>   prints the launch as JSON.

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { isMain, usage } from "../lib/entry.mjs";
import { slugOf } from "./freeze.mjs";
import { longOf, shortOf as realShortOf } from "./shortpath.mjs";

export const MODEL = "opus[1m]";
export const EFFORT = "xhigh";
export const PERMISSION_MODE = "auto";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Tools that reach other sessions or outlive this one. An arm needs none of them.
export const CROSS_SESSION_TOOLS = [
  "SendMessage",
  "ListAgents",
  "ReadNotifications",
  "FetchInboxMessage",
  "SendUserFile",
  "PushNotification",
  "RemoteTrigger",
  "CronCreate",
  "CronDelete",
  "ScheduleWakeup",
];

// MCP servers that reach the user's accounts, browsers or published pages. A headless child loads
// the user-scope and claude.ai servers (measured on CLI 2.1.318: Gmail, Drive, Calendar, Sheets,
// Claude Docs and Playwright loaded; Chrome and artifacts did not, and are listed in case they
// start to), and a bare server name in the deny set removes every tool of that server from the
// session: none is listed among its tools, and a call answers "No such tool available" (measured).
export const ACCOUNT_MCP_SERVERS = [
  "claude_ai_Gmail",
  "claude_ai_Google_Drive",
  "claude_ai_Google_Calendar",
  "claude_ai_Google_Sheets",
  "claude_ai_Claude_Docs",
  "claude-in-chrome",
  "playwright",
  "claude-artifacts",
];
// The research servers every arm keeps, the same for each: the only MCP servers an arm may see.
// A server in neither list is new; the probe fails on it until it is sorted into one of them.
export const RESEARCH_MCP_SERVERS = ["claude_ai_Context7", "context7", "gemini-grounding", "sequential-thinking"];

// A tool every session has and no arm needs, denied by bare name so the probe can show that a
// bare-name rule removes a tool (a cross-session tool may be absent from a headless session
// anyway, which would prove nothing about the rule).
export const CANARY_TOOL = "NotebookEdit";

// An absolute path in a permission rule's form: Claude Code matches Windows paths in POSIX
// form, C:\Users\x as /c/Users/x, and "//" anchors a rule at the filesystem root.
export function rulePath(p) {
  const posix = resolve(p).replace(/\\/g, "/").replace(/\/+$/, "");
  const drive = posix.match(/^([A-Za-z]):\/(.*)$/);
  return drive ? `//${drive[1].toLowerCase()}/${drive[2]}` : `/${posix}`;
}

// Every spelling of a path that a rule must name: the long one, plus, for each component with an
// 8.3 short name, the same path with that component short, mixed freely with the others (each
// such component doubles the forms). `shortOf` is shortpath.mjs's (or a test's), or null where
// nothing has a short name. Case needs no forms of its own: rules match either case (measured).
export function spellings(p, shortOf) {
  const long = resolve(p);
  const short = shortOf ? shortOf(long) : null;
  if (!short) return [long];
  const L = long.split(/[\\/]/);
  const S = resolve(short).split(/[\\/]/);
  if (L.length !== S.length) throw new Error(`the short path ${short} does not pair, component by component, with ${long}`);
  let forms = [[]];
  L.forEach((name, i) => {
    const alts = S[i].toLowerCase() === name.toLowerCase() ? [name] : [name, S[i]];
    forms = forms.flatMap((f) => alts.map((a) => [...f, a]));
  });
  return forms.map((f) => f.join(sep));
}

// The folder names directly under `dir`, or none when it does not exist.
const foldersIn = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : []);

// The deny set every arm runs under. Each path rule is written in every spelling `shortOf` finds.
export function denyRules({ home = homedir(), liveRepo, shortOf = null, listDir = foldersIn }) {
  if (!liveRepo) throw new Error("denyRules needs the live repo's path");
  const claude = join(home, ".claude");
  const rules = [];
  const forms = (tool, paths, tail = "/**") => paths.map((p) => `${tool}(${rulePath(p)}${tail})`);
  const under = (tool, root) => forms(tool, spellings(root, shortOf));
  const at = (tool, file) => forms(tool, spellings(file, shortOf), "");
  const repoForms = spellings(liveRepo, shortOf);
  // Writes: the live repo, the plugin cache and registry, the personal skills folder, and
  // the user's settings and CLAUDE.md files.
  rules.push(...forms("Edit", repoForms));
  for (const root of [join(claude, "plugins"), join(claude, "skills")]) rules.push(...under("Edit", root));
  for (const file of ["settings.json", "settings.local.json", "CLAUDE.md"]) rules.push(...at("Edit", join(claude, file)));
  // ~/.claude.json holds the user-scope MCP servers and every project's trust and allowed tools.
  rules.push(...at("Edit", join(home, ".claude.json")));
  // Reads and writes under the live repo's session folders (transcripts, memory, job folders).
  // A session started through the repo's short name gets a folder named from that spelling
  // (C--Users-x-AI-LEA-1...), so there is one slug per spelling of the repo. The globs cover every
  // such folder by its long name, one made later included, but no glob can match a folder's own
  // 8.3 name (C--USE~3 style), so each folder there now is also named by its own.
  const projects = join(claude, "projects");
  const slugs = repoForms.map(slugOf);
  for (const p of spellings(projects, shortOf)) for (const slug of slugs) rules.push(`Read(${rulePath(p)}/${slug}*/**)`, `Edit(${rulePath(p)}/${slug}*/**)`);
  if (shortOf) {
    for (const name of listDir(projects)) {
      if (!slugs.some((slug) => name.toLowerCase().startsWith(slug.toLowerCase()))) continue;
      for (const p of spellings(join(projects, name), shortOf)) if (basename(p) !== name) rules.push(`Read(${rulePath(p)}/**)`, `Edit(${rulePath(p)}/**)`);
    }
  }
  // Reads of the live Back Nine tree, where build 2's own plan and sessions live.
  rules.push(...under("Read", join(liveRepo, "projects", "the-back-nine")));
  rules.push(...CROSS_SESSION_TOOLS, CANARY_TOOL, ...ACCOUNT_MCP_SERVERS.map((s) => `mcp__${s}`));
  return rules;
}

// True when `inner` is `outer` or sits inside it.
const within = (inner, outer) => {
  const r = relative(resolve(outer), resolve(inner));
  return r === "" || (!r.startsWith("..") && !isAbsolute(r));
};

// `shortOf` has no default: a caller that left it out would get a deny set in long form only,
// which a call through an 8.3 name walks past. Pass shortpath.mjs's shortOf; null is refused on
// Windows, where 8.3 names exist, and allowed elsewhere.
export function buildLaunch({ cwd, stateDir, sessionId, prompt, liveRepo, shortOf, env = process.env, home = homedir(), model = MODEL, effort = EFFORT, platform = process.platform }) {
  if (typeof shortOf !== "function" && !(shortOf === null && platform !== "win32")) throw new Error(`buildLaunch needs shortOf: shortpath.mjs's${platform === "win32" ? "" : ", or null off Windows"}; without it the deny set is long-form only`);
  if (!cwd || !isAbsolute(cwd)) throw new Error(`cwd must be an absolute path, got ${cwd}`);
  if (!stateDir || !isAbsolute(stateDir)) throw new Error(`stateDir must be an absolute path, got ${stateDir}`);
  if (!liveRepo) throw new Error("buildLaunch needs the live repo's path for the deny set");
  // Every path in its long form before any check or rule is made from it: a copy or state folder
  // spelled through the repo's 8.3 name would pass a text compare against the long repo path,
  // and a home or repo given short would leave the deny set without its long forms (the real
  // shortOf refuses one). longOf keeps a part that does not exist yet as given.
  [cwd, stateDir, liveRepo, home] = [cwd, stateDir, liveRepo, home].map(longOf);
  if (within(stateDir, cwd) || within(cwd, stateDir)) throw new Error(`the state folder sits beside the copy, never inside it (or around it): ${stateDir} and ${cwd}`);
  // The deny set refuses every write under the live repo, so a copy or state folder there
  // could not be written by its own arm.
  for (const p of [cwd, stateDir]) if (within(p, liveRepo)) throw new Error(`${p} sits inside the live repo ${liveRepo}; copies and state folders live outside it`);
  if (!UUID.test(sessionId || "")) throw new Error(`sessionId must be a UUID, got ${sessionId}`);
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("prompt must be a non-empty string");

  const childEnv = {};
  const stripped = [];
  for (const [k, v] of Object.entries(env)) {
    if (/^claude/i.test(k)) stripped.push(k);
    else childEnv[k] = v;
  }
  childEnv.CLAUDE_CODE_SUBAGENT_MODEL = "opus";
  childEnv.MSYS_NO_PATHCONV = "1";

  const settings = { permissions: { deny: denyRules({ home, liveRepo, shortOf }) } };
  const args = [
    "-p", prompt,
    "--output-format", "json",
    "--model", model,
    "--effort", effort,
    "--session-id", sessionId,
    "--permission-mode", PERMISSION_MODE,
    "--permission-prompts", "none",
    "--add-dir", stateDir,
    "--settings", JSON.stringify(settings),
  ];
  return { file: "claude", args, env: childEnv, cwd, settings, stripped: stripped.sort() };
}

if (isMain(import.meta.url)) {
  const [cwd, stateDir, sessionId, ...words] = process.argv.slice(2);
  if (!words.length) usage("node launch.mjs <cwd> <state-dir> <session-uuid> <prompt>");
  // buildLaunch takes the repo to its long form, whatever spelling this script was started through.
  const liveRepo = join(import.meta.dirname, "..", "..", "..", "..");
  const l = buildLaunch({ cwd, stateDir, sessionId, prompt: words.join(" "), liveRepo, shortOf: realShortOf });
  // Names only: the environment's values never leave this process.
  console.log(JSON.stringify({ ...l, env: Object.keys(l.env).sort() }, null, 1));
}
