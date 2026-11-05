#!/usr/bin/env node
// The check every file the bench commits passes before it is written (KTD24 of
// docs/plans/hybrid-plan-step-plan.md). The repo is public, and this laptop's sessions carry
// live API keys in their environment (OpenAI and Context7, names checked 2026-11-01), which
// KTD16's stripping of CLAUDE-prefixed variables leaves in place. A committed file must hold:
//   - no value of any launching-environment variable whose name contains KEY, TOKEN, SECRET
//     or PASS, raw or JSON-escaped;
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

// What a text is checked against: each secret-named variable's value in every form it can be
// written in, and the names whose values are too short to check.
export function secretsOf(env) {
  const checked = [];
  const unchecked = [];
  for (const [name, raw] of Object.entries(env || {})) {
    if (!SECRET_NAME.test(name) || raw === undefined || raw === null || raw === "") continue;
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
export function findSecrets(text, { env = process.env, email = accountEmail() } = {}) {
  if (email !== false && !(typeof email === "string" && email.includes("@"))) throw new Error("the account email was not found, so the email check cannot run; nothing is written (pass email: false only where there is no account)");
  const { checked, unchecked } = secretsOf(env);
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
