#!/usr/bin/env node
// Builds one headless child session's command line and environment (KTD16 of
// docs/plans/hybrid-plan-step-plan.md). Pure: it starts nothing. The probe, U6's smoke run
// and U7's run-arm all launch through it, so every child is launched one way.
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
//
// Usage: node launch.mjs <cwd> <state-dir> <session-uuid> <prompt>   prints the launch as JSON.

import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { isMain, usage } from "./entry.mjs";
import { slugOf } from "./freeze.mjs";

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

// The deny set every arm runs under.
export function denyRules({ home = homedir(), liveRepo }) {
  if (!liveRepo) throw new Error("denyRules needs the live repo's path");
  const claude = join(home, ".claude");
  const rules = [];
  // Writes: the live repo, the plugin cache and registry, the personal skills folder, and
  // the user's settings and CLAUDE.md files.
  for (const root of [liveRepo, join(claude, "plugins"), join(claude, "skills")]) rules.push(`Edit(${rulePath(root)}/**)`);
  for (const file of ["settings.json", "settings.local.json", "CLAUDE.md"]) rules.push(`Edit(${rulePath(join(claude, file))})`);
  // ~/.claude.json holds the user-scope MCP servers and every project's trust and allowed tools.
  rules.push(`Edit(${rulePath(join(home, ".claude.json"))})`);
  // Reads and writes under the live repo's session folders (transcripts, memory, job folders).
  const sessions = `${rulePath(join(claude, "projects"))}/${slugOf(liveRepo)}*/**`;
  rules.push(`Read(${sessions})`, `Edit(${sessions})`);
  // Reads of the live Back Nine tree, where build 2's own plan and sessions live.
  rules.push(`Read(${rulePath(join(liveRepo, "projects", "the-back-nine"))}/**)`);
  rules.push(...CROSS_SESSION_TOOLS, CANARY_TOOL);
  return rules;
}

// True when `inner` is `outer` or sits inside it.
const within = (inner, outer) => {
  const r = relative(resolve(outer), resolve(inner));
  return r === "" || (!r.startsWith("..") && !isAbsolute(r));
};

export function buildLaunch({ cwd, stateDir, sessionId, prompt, liveRepo, env = process.env, home = homedir(), model = MODEL, effort = EFFORT }) {
  if (!cwd || !isAbsolute(cwd)) throw new Error(`cwd must be an absolute path, got ${cwd}`);
  if (!stateDir || !isAbsolute(stateDir)) throw new Error(`stateDir must be an absolute path, got ${stateDir}`);
  if (within(stateDir, cwd) || within(cwd, stateDir)) throw new Error(`the state folder sits beside the copy, never inside it (or around it): ${stateDir} and ${cwd}`);
  if (!liveRepo) throw new Error("buildLaunch needs the live repo's path for the deny set");
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

  const settings = { permissions: { deny: denyRules({ home, liveRepo }) } };
  const args = [
    "-p", prompt,
    "--output-format", "json",
    "--model", model,
    "--effort", effort,
    "--session-id", sessionId,
    "--permission-mode", PERMISSION_MODE,
    "--permission-prompts", "none",
    "--add-dir", resolve(stateDir),
    "--settings", JSON.stringify(settings),
  ];
  return { file: "claude", args, env: childEnv, cwd: resolve(cwd), settings, stripped: stripped.sort() };
}

if (isMain(import.meta.url)) {
  const [cwd, stateDir, sessionId, ...words] = process.argv.slice(2);
  if (!words.length) usage("node launch.mjs <cwd> <state-dir> <session-uuid> <prompt>");
  const l = buildLaunch({ cwd, stateDir, sessionId, prompt: words.join(" "), liveRepo: resolve(join(import.meta.dirname, "..", "..", "..", "..")) });
  // Names only: the environment's values never leave this process.
  console.log(JSON.stringify({ ...l, env: Object.keys(l.env).sort() }, null, 1));
}
