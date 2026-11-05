#!/usr/bin/env node
// The check every file the bench commits passes before it is written (KTD24 of
// docs/plans/hybrid-plan-step-plan.md). The repo is public, and this laptop's sessions carry
// live API keys in their environment (OpenAI and Context7, names checked 2026-11-01), which
// KTD16's stripping of CLAUDE-prefixed variables leaves in place. A committed file must hold:
//   - no value of any launching-environment variable whose name contains KEY, TOKEN, SECRET
//     or PASS, raw or JSON-escaped, nor of any such line in the repo-root .env, where the
//     real keys live and which a session loads before a script that needs one (a child that
//     did so could put a value into its transcript without it ever being in this environment);
//   - not the account's email address.
// A refusal names the variable, never its value. When the account record yields no email
// address the check refuses rather than skipping it; a caller that has no account (a test)
// says so with email: false.
//
// Values under 8 characters are not checked (a "1" would refuse every file holding a 1), and
// are never skipped quietly: each result lists them by name, for the caller to record.
//
// Usage: node secrets.mjs <file>...   exits 1 naming each hit.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { isMain, usage } from "./entry.mjs";

export const SECRET_NAME = /KEY|TOKEN|SECRET|PASS/i;
export const MIN_CHECKED = 8;

// The account's email address, from Claude Code's own account record; null when none is there.
export function accountEmail(home = homedir()) {
  const p = join(home, ".claude.json");
  if (!existsSync(p)) return null;
  try {
    const e = JSON.parse(readFileSync(p, "utf8"))?.oauthAccount?.emailAddress;
    return typeof e === "string" && e.includes("@") ? e : null;
  } catch {
    return null;
  }
}

// The repo-root .env: one gitignored file every project loads first. Not there (CI) means none.
export const ROOT_ENV = join(import.meta.dirname, "..", "..", "..", "..", ".env");

// A .env file's KEY=VALUE lines, as an object; {} when the file is not there. An "export " prefix
// is allowed and comment and blank lines are skipped. A quoted value is what lies between its
// quotes, whatever follows them. An unquoted one ends at its first "#" or space: bash ends it at
// a space or a " #", the dotenv package at any "#", so the shortest reading is kept, and a text
// holding either reading still holds it. One that starts with "#" is empty to dotenv but whole
// to bash (the way our sessions load it), so it keeps bash's reading rather than vanishing from
// the check. A "$NAME" inside is not expanded (none in ours).
export function readEnvFile(path) {
  if (!path || !existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const v = m[2];
    const q = v[0] === '"' || v[0] === "'" ? v[0] : null;
    const close = q ? v.indexOf(q, 1) : -1;
    out[m[1]] = q ? (close > 0 ? v.slice(1, close) : v.slice(1).trim()) : v.split(/[#\s]/)[0] || v.trim().split(/\s/)[0];
  }
  return out;
}

// What a text is checked against: each secret-named variable's value in every form it can be
// written in, and the names whose values are too short to check. The repo-root .env's lines join
// the environment's; one whose value differs from the environment's is checked too, named
// "<NAME> (repo-root .env)". envFile: false leaves the file out (a test with its own fixture).
export function secretsOf(env, { envFile = ROOT_ENV } = {}) {
  const checked = [];
  const unchecked = [];
  const pairs = Object.entries(env || {}).map(([name, raw]) => ({ name, base: name, raw }));
  if (envFile !== false) for (const [base, raw] of Object.entries(readEnvFile(envFile))) if (String((env || {})[base] ?? "") !== raw) pairs.push({ name: `${base} (repo-root .env)`, base, raw });
  for (const { name, base, raw } of pairs) {
    if (!SECRET_NAME.test(base) || raw === undefined || raw === null || raw === "") continue;
    const value = String(raw);
    if (value.length < MIN_CHECKED) {
      unchecked.push(name);
      continue;
    }
    checked.push({ name, forms: [...new Set([value, JSON.stringify(value).slice(1, -1)])] });
  }
  return { checked, unchecked: unchecked.sort() };
}

// The names whose values the text holds; "the account email" counts as one.
export function findSecrets(text, { env = process.env, email = accountEmail(), envFile = ROOT_ENV } = {}) {
  if (email !== false && !(typeof email === "string" && email.includes("@"))) throw new Error("the account email was not found, so the email check cannot run; nothing is written (pass email: false only where there is no account)");
  const { checked, unchecked } = secretsOf(env, { envFile });
  const hits = checked.filter((s) => s.forms.some((f) => text.includes(f))).map((s) => s.name);
  if (email && text.toLowerCase().includes(String(email).toLowerCase())) hits.push("the account email");
  return { hits, unchecked };
}

export function assertClean(text, opts = {}, label = "text") {
  const r = findSecrets(text, opts);
  if (r.hits.length) throw new Error(`${label} holds the value of ${r.hits.join(", ")}; not written`);
  return r;
}

// Writes the file only when it is clean; returns the names left unchecked for the caller to record.
export function writeChecked(path, text, opts = {}) {
  const r = assertClean(text, opts, path);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return { unchecked: r.unchecked };
}

if (isMain(import.meta.url)) {
  const files = process.argv.slice(2);
  if (!files.length) usage("node secrets.mjs <file>...");
  let bad = 0;
  for (const f of files) {
    const r = findSecrets(readFileSync(f, "utf8"));
    if (r.hits.length) {
      bad++;
      console.log(`${f}: holds the value of ${r.hits.join(", ")}`);
    }
  }
  const { unchecked } = secretsOf(process.env);
  console.log(`${files.length} files, ${bad} with a secret${unchecked.length ? `; unchecked (value under ${MIN_CHECKED} characters): ${unchecked.join(", ")}` : ""}`);
  if (bad) process.exitCode = 1;
}
