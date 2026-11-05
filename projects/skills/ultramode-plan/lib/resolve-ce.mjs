#!/usr/bin/env node
// THE CE RESOLVER (KTD2 and U3 of docs/plans/hybrid-plan-step-plan.md). A run reads the
// compound-engineering (CE) plugin's method and persona files fresh, never copied or pinned (R2),
// so it must know exactly which ones it read. This reads Claude Code's plugin registry, takes CE's
// user-scope entry, and lists every CE file a run asks for, each with its sha256 or as missing,
// never a count of what was found (playbook insight 013). It never globs the plugin cache: an
// update leaves the old version's folder on disk, marked orphaned, for about 14 days (3.14.3 and
// 3.34.0 sat beside 3.35.3 on 2026-11-04), so a glob could read a superseded CE.
//
// The registry's shape is measured, not assumed (playbook insight 003). Read on 2026-11-04 (CLI
// 2.1.318): `~/.claude/plugins/installed_plugins.json` is { version: 2, plugins: { "<name>@<market>":
// [ { scope, installPath, version, installedAt, lastUpdated, gitCommitSha }, ... ] } }, CE 3.35.3
// at 799ac9a, and one entry there (claude-code-setup) carried no gitCommitSha. A registry in any
// other shape, a CE entry without an absolute installPath or a full gitCommitSha, or an install
// folder not on disk reads as "CE absent" with its reason: every seat then runs its inline role and
// the receipt says so (KTD2: the run never stops for CE's absence).
//
// A run resolves once at its start and again at every restart (run-record.mjs calls resolveCe), so
// each stage runs wholly on one resolution and the receipt names every CE commit with the stages it
// served. Run by the main loop as a command; never inlined into a Workflow script (KTD1).
//
// Usage: node resolve-ce.mjs resolve [<registry path>]   prints the resolution as one JSON object.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { isMain, usage } from "./entry.mjs";

export const PLUGIN = "compound-engineering@every-marketplace";
export const defaultRegistry = () => join(homedir(), ".claude", "plugins", "installed_plugins.json");

const PLAN = "skills/ce-plan/references/";
const DOC = "skills/ce-doc-review/references/";
// The high-risk panel's four adversary angles (KTD6), each reading the adversarial persona, under
// the keys flow.mjs's tests give them; U4 owns the seat names and widens this list if it renames them.
const PANEL = ["adv-sequencing", "adv-settled", "adv-hidden-work", "adv-verification"];
// The research and deepen helpers' agent files, each its own seat under its file stem: research's
// set from research.md (repo research, learnings, spec-flow, the agent-native triage and the three
// external researchers) and the deepen's from deepening-workflow.md's section-to-agent mapping, read
// in CE 3.35.3. slack-researcher is left out (it runs only with Slack tools and a user's ask, and
// neither applies), and so is ce-doc-review's whole-doc-reviewer, which KTD6 rejects.
const AGENTS = [
  "repo-research-analyst", "learnings-researcher", "spec-flow-analyzer", "agent-native-planning-strategist",
  "best-practices-researcher", "framework-docs-researcher", "web-researcher", "git-history-analyzer",
  "architecture-strategist", "pattern-recognition-specialist", "performance-oracle", "security-sentinel",
  "data-integrity-guardian",
];

// Every CE file a run asks for, relative to the install path, with the seats that read it. A seat
// whose file is missing runs its inline role, and the receipt names it with the file and the CE
// commit it looked in (R2, R9). "write", "research" and "lens-picks" are the main loop's own reads
// (the plan's shape, KTD3; research's mapping, KTD4; the conditional lenses, KTD6); "scorer" is the
// deepen's scorer (KTD5).
export const CE_FILES = [
  { key: "plan-sections", file: `${PLAN}plan-sections.md`, seats: ["write"] },
  { key: "research", file: `${PLAN}research.md`, seats: ["research"] },
  { key: "deepening-workflow", file: `${PLAN}deepening-workflow.md`, seats: ["scorer"] },
  { key: "final-review", file: `${PLAN}final-review.md`, seats: ["scorer"] },
  { key: "persona-selection", file: `${DOC}persona-selection.md`, seats: ["lens-picks"] },
  { key: "coherence", file: `${DOC}personas/coherence-reviewer.md`, seats: ["coherence"] },
  { key: "feasibility", file: `${DOC}personas/feasibility-reviewer.md`, seats: ["feasibility"] },
  { key: "scope-guardian", file: `${DOC}personas/scope-guardian-reviewer.md`, seats: ["scope-guardian"] },
  { key: "adversarial", file: `${DOC}personas/adversarial-document-reviewer.md`, seats: ["adversarial", ...PANEL] },
  { key: "product", file: `${DOC}personas/product-lens-reviewer.md`, seats: ["product"] },
  { key: "security", file: `${DOC}personas/security-lens-reviewer.md`, seats: ["security"] },
  { key: "design", file: `${DOC}personas/design-lens-reviewer.md`, seats: ["design"] },
  ...AGENTS.map((a) => ({ key: a, file: `${PLAN}agents/${a}.md`, seats: [a] })),
];

const SHA = /^[0-9a-f]{40}$/;
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// Resolves CE from the registry at `registry`. Every file in CE_FILES comes back, in order, with
// exactly one of `sha256` (read from the resolved install path) and `missing` (why it is not).
export function resolveCe({ registry = defaultRegistry(), now = new Date() } = {}) {
  const base = { plugin: PLUGIN, registry, resolvedAt: now.toISOString() };
  const absent = (reason) => ({
    ...base, commit: null, absent: reason, version: null, installPath: null, lastUpdated: null,
    files: CE_FILES.map((f) => ({ ...f, path: null, missing: "CE absent" })),
  });
  if (!existsSync(registry)) return absent(`there is no plugin registry at ${registry}`);
  let reg;
  try {
    reg = JSON.parse(readFileSync(registry, "utf8"));
  } catch (e) {
    return absent(`the plugin registry at ${registry} does not parse: ${e.message}`);
  }
  if (!reg || reg.version !== 2 || !reg.plugins || typeof reg.plugins !== "object" || Array.isArray(reg.plugins)) {
    return absent(`the plugin registry is not in the measured shape (version 2, a plugins map); it reads version ${JSON.stringify(reg?.version)}`);
  }
  const entries = reg.plugins[PLUGIN];
  if (entries === undefined) return absent(`the registry has no ${PLUGIN} entry`);
  if (!Array.isArray(entries)) return absent(`the registry's ${PLUGIN} entry is not a list of installs`);
  const users = entries.filter((e) => e && e.scope === "user");
  if (users.length === 0) return absent(`the registry has no user-scope ${PLUGIN} install (scopes: ${entries.map((e) => JSON.stringify(e?.scope)).join(", ") || "none"})`);
  // Which of two user-scope installs a session loads is unmeasured, so neither is guessed at.
  if (users.length > 1) return absent(`the registry has ${users.length} user-scope ${PLUGIN} installs, and which one a session loads is unmeasured`);
  const e = users[0];
  if (typeof e.installPath !== "string" || !isAbsolute(e.installPath)) return absent(`the user-scope ${PLUGIN} install names no absolute installPath`);
  if (typeof e.gitCommitSha !== "string" || !SHA.test(e.gitCommitSha)) return absent(`the user-scope ${PLUGIN} install names no full gitCommitSha (got ${JSON.stringify(e.gitCommitSha)})`);
  if (!existsSync(e.installPath) || !statSync(e.installPath).isDirectory()) return absent(`the registry's install path ${e.installPath} is not a folder on disk`);
  const files = CE_FILES.map((f) => {
    const path = join(e.installPath, ...f.file.split("/"));
    if (!existsSync(path) || !statSync(path).isFile()) return { ...f, path, missing: "not in the install" };
    return { ...f, path, sha256: sha256(readFileSync(path)) };
  });
  return { ...base, commit: e.gitCommitSha, absent: null, version: typeof e.version === "string" ? e.version : null, installPath: e.installPath, lastUpdated: typeof e.lastUpdated === "string" ? e.lastUpdated : null, files };
}

// Checks a resolution read back from a file: the fields a run acts on, never defaulted.
export function checkResolution(r) {
  if (!r || typeof r !== "object" || !Array.isArray(r.files)) throw new Error("resolve-ce: a resolution is the object resolveCe returns, files list included");
  if (r.commit !== null && !(typeof r.commit === "string" && SHA.test(r.commit))) throw new Error(`resolve-ce: a resolution's commit is a full git sha, or null for CE absent; got ${JSON.stringify(r.commit)}`);
  if ((r.commit === null) !== (typeof r.absent === "string")) throw new Error("resolve-ce: a resolution is either a commit or absent with its reason, never both or neither");
  const keys = r.files.map((f) => f?.key);
  const want = CE_FILES.map((f) => f.key);
  if (keys.join("\n") !== want.join("\n")) throw new Error(`resolve-ce: a resolution lists the files ${keys.join(", ")}, not this resolver's ${want.join(", ")}`);
  for (const f of r.files) {
    const has = ["sha256", "missing"].filter((k) => k in f);
    if (has.length !== 1) throw new Error(`resolve-ce: ${f.key} needs exactly one of sha256 and missing`);
  }
  return r;
}

// Two resolutions read the same CE bytes: the same commit, or both absent, and every file the same
// (the same sha256, or missing in both).
export function sameResolution(a, b) {
  checkResolution(a);
  checkResolution(b);
  if (a.commit !== b.commit) return false;
  return a.files.every((f, i) => (f.sha256 ?? null) === (b.files[i].sha256 ?? null));
}

// The files whose bytes changed under one commit: a CE file changed in place, the case the plan
// names as reopening its "never re-hash before each launch" call (Scope Boundaries).
export function changedInPlace(a, b) {
  if (a.commit === null || a.commit !== b.commit) return [];
  return a.files.filter((f, i) => "sha256" in f && "sha256" in b.files[i] && f.sha256 !== b.files[i].sha256).map((f) => f.file);
}

// The seats in `ran` that ran without their CE file under this resolution, in the receipt's form
// (flow.mjs's receipt `inline` entries): { seat, file, commit }, commit null for CE absent.
export function inlineSeats(r, ran) {
  checkResolution(r);
  if (!Array.isArray(ran)) throw new Error("resolve-ce: ran is the list of seat keys that ran");
  const out = [];
  for (const f of r.files) {
    if (!("missing" in f)) continue;
    for (const seat of f.seats) if (ran.includes(seat)) out.push({ seat, file: f.file, commit: r.commit });
  }
  return out;
}

// One file of a resolution by its key: { path, sha256 }, or null when it is missing.
export function fileOf(r, key) {
  const f = checkResolution(r).files.find((x) => x.key === key);
  if (!f) throw new Error(`resolve-ce: no CE file is keyed ${JSON.stringify(key)} (one of: ${CE_FILES.map((x) => x.key).join(", ")})`);
  return "sha256" in f ? { path: f.path, sha256: f.sha256 } : null;
}

if (isMain(import.meta.url)) {
  const [command, registry] = process.argv.slice(2);
  if (command !== "resolve") usage("node resolve-ce.mjs resolve [<registry path>]");
  try {
    console.log(JSON.stringify(resolveCe(registry ? { registry } : {}), null, 1));
  } catch (e) {
    console.error(`resolve-ce: ${e.message}`);
    process.exit(2);
  }
}
