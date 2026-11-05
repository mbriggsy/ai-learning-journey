#!/usr/bin/env node
// Frozen copies of one start commit (KTD16 and U1 of docs/plans/hybrid-plan-step-plan.md).
//
// A copy holds the start commit's history and nothing after it, checked out sparse to the
// given paths, with no remote and no alternates file, so nothing later can be fetched,
// pushed or borrowed from the live repo. How:
//   1. One bare base is fetched from the live repo by the start sha alone, so it holds
//      exactly the history that commit reaches. Its FETCH_HEAD, which names the live repo,
//      is deleted.
//   2. Each copy is a local clone of the base (hardlinked objects, never an alternates
//      file), whose remote is then removed, its reflog emptied and its tree checked out
//      sparse, byte for byte as git holds it (core.autocrlf off in the copy).
// Copy paths all have one length (KTD16) and a name no Claude Code session has used: a
// path whose session folder already exists under ~/.claude/projects refuses, so an arm
// never inherits an earlier session's memory folder.
// manifest.json names every path made here; deleteFrozen removes those and nothing else.
//
// Usage:
//   node freeze.mjs make <root> <repo> <commit> <name,name,...> <sparse-path,sparse-path,...>
//   node freeze.mjs delete <root>/manifest.json

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { isMain, usage } from "./entry.mjs";

// Letters, digits, hyphens and path separators only. Claude Code names a working folder's
// session folder by replacing every other character with "-"; the window skill's parser
// replaces only ":", "\" and "/". On a path of these characters the two rules agree, so
// the session-folder check below cannot miss by using the wrong one.
const SAFE_PATH = /^[A-Za-z0-9:\\/-]+$/;
const SAFE_NAME = /^[A-Za-z0-9-]+$/;

// The session folder name Claude Code gives a working folder.
export const slugOf = (path) => resolve(path).replace(/[^A-Za-z0-9]/g, "-");

// Claude Code keeps that name whole only up to 200 characters; a longer one is cut to 200 and
// given a hash of the path (read in the 2.1.318 binary: `if(n.length<=200)return n;return
// \`${n.slice(0,200)}-${hash}\``), which slugOf does not model. freeze refuses such a copy path.
export const MAX_SLUG = 200;

export const defaultProjectsDir = () => join(homedir(), ".claude", "projects");

function git(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
    stdio: ["ignore", "pipe", "pipe"],
    // Git Bash rewrites "/projects/x/" into "C:/Program Files/Git/projects/x/" when a
    // shell launches git (measured on the sparse patterns, 2026-11-04). execFileSync starts
    // git with no shell, so nothing rewrites; the variable keeps it so under any wrapper.
    env: { ...process.env, MSYS_NO_PATHCONV: "1", GIT_TERMINAL_PROMPT: "0" },
  });
}

// The sparse pattern for one path at the commit: a folder takes a trailing slash.
function patternOf(repo, sha, path) {
  const clean = path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!clean || clean.split("/").includes("..")) throw new Error(`sparse path "${path}" is empty or climbs out of the repo`);
  let type;
  try {
    type = git(repo, ["cat-file", "-t", `${sha}:${clean}`]).trim();
  } catch {
    throw new Error(`sparse path "${clean}" does not exist at ${sha.slice(0, 12)}`);
  }
  return { path: clean, pattern: type === "tree" ? `/${clean}/` : `/${clean}` };
}

export function freeze({ repo, commit, root, names, sparse, projectsDir = defaultProjectsDir() }) {
  if (!repo || !commit || !root) throw new Error("freeze needs repo, commit and root");
  root = resolve(root);
  if (!SAFE_PATH.test(root)) throw new Error(`root ${root} holds a character other than letters, digits, "-" and separators`);
  if (existsSync(root)) throw new Error(`${root} already exists; a frozen root is never reused`);
  if (!Array.isArray(names) || !names.length) throw new Error("freeze needs at least one copy name");
  if (!Array.isArray(sparse) || !sparse.length) throw new Error("freeze needs at least one sparse path");
  for (const n of names) {
    if (!SAFE_NAME.test(n)) throw new Error(`copy name "${n}" is not letters, digits and "-"`);
    if (n.toLowerCase() === "base") throw new Error(`copy name "base" is the base repository's`);
  }
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) throw new Error(`copy names repeat: ${names.join(", ")}`);
  const paths = names.map((n) => join(root, n));
  if (new Set(paths.map((p) => p.length)).size !== 1) {
    throw new Error(`copy paths differ in length (${paths.map((p) => p.length).join(", ")}); KTD16 gives every arm a path of one length`);
  }
  const used = existsSync(projectsDir) ? new Set(readdirSync(projectsDir).map((d) => d.toLowerCase())) : new Set();
  for (const p of paths) {
    const slug = slugOf(p);
    if (slug.length > MAX_SLUG) throw new Error(`${p} would name a session folder of ${slug.length} characters; Claude Code cuts one over ${MAX_SLUG} and adds a hash, which the bench does not model: use a shorter root`);
    if (used.has(slug.toLowerCase())) throw new Error(`a Claude Code session already ran in ${p} (${join(projectsDir, slug)} exists); use a path never used before`);
  }

  const sha = git(repo, ["rev-parse", "--verify", `${commit}^{commit}`]).trim();
  const patterns = sparse.map((s) => patternOf(repo, sha, s));

  mkdirSync(root, { recursive: true });
  const base = join(root, "base");
  git(root, ["init", "-q", "--bare", base]);
  git(base, ["fetch", "-q", "--no-tags", resolve(repo), `${sha}:refs/heads/main`]);
  git(base, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  rmSync(join(base, "FETCH_HEAD"), { force: true });

  const copies = [];
  for (const [i, name] of names.entries()) {
    const p = paths[i];
    git(root, ["clone", "-q", "--local", "--no-checkout", base, p]);
    git(p, ["remote", "remove", "origin"]);
    git(p, ["config", "core.longpaths", "true"]);
    git(p, ["config", "core.autocrlf", "false"]);
    git(p, ["sparse-checkout", "set", "--no-cone", ...patterns.map((x) => x.pattern)]);
    git(p, ["read-tree", "-mu", "HEAD"]);
    git(p, ["reflog", "expire", "--expire=now", "--all"]);
    const head = git(p, ["rev-parse", "HEAD"]).trim();
    if (head !== sha) throw new Error(`${name}: HEAD is ${head}, not the start ${sha}`);
    if (git(p, ["remote"]).trim()) throw new Error(`${name}: still has a remote`);
    if (existsSync(join(p, ".git", "objects", "info", "alternates"))) throw new Error(`${name}: has an alternates file`);
    const subtrees = {};
    for (const x of patterns) subtrees[x.path] = git(p, ["rev-parse", `HEAD:${x.path}`]).trim();
    copies.push({ name, path: p, subtrees });
  }

  const manifest = { v: 1, made_by: "freeze.mjs", start: sha, repo: resolve(repo), root, base, sparse: patterns.map((x) => x.path), copies };
  writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
  return manifest;
}

// Deletes the base and the copies a manifest names, then the manifest, then the root if
// nothing else is left in it. Refuses a manifest naming any path that is not directly under
// its own root, before deleting anything.
export function deleteFrozen(manifestPath) {
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  const root = resolve(m.root || "");
  if (m.made_by !== "freeze.mjs" || !m.root) throw new Error(`${manifestPath} is not a freeze.mjs manifest`);
  if (resolve(dirname(manifestPath)).toLowerCase() !== root.toLowerCase()) throw new Error(`${manifestPath} does not sit in its own root ${root}`);
  const targets = [m.base, ...(m.copies || []).map((c) => c.path)].map((p) => resolve(String(p)));
  for (const t of targets) {
    if (dirname(t).toLowerCase() !== root.toLowerCase()) throw new Error(`${t} is not directly under ${root}; refusing to delete anything`);
  }
  const deleted = [];
  for (const t of targets) {
    if (!existsSync(t)) continue;
    // Git writes its packs read-only; maxRetries rides out Windows' brief locks on them.
    rmSync(t, { recursive: true, force: true, maxRetries: 5 });
    deleted.push(t);
  }
  rmSync(manifestPath, { force: true });
  const left = existsSync(root) ? readdirSync(root) : [];
  if (existsSync(root) && !left.length) rmdirSync(root);
  return { deleted, kept: left.map((f) => join(root, f)) };
}

if (isMain(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const LINE = "node freeze.mjs make <root> <repo> <commit> <name,...> <sparse-path,...> | delete <root>/manifest.json";
  if (cmd === "make" && rest.length === 5) {
    const [root, repo, commit, names, sparse] = rest;
    const m = freeze({ root, repo, commit, names: names.split(","), sparse: sparse.split(",") });
    console.log(`start ${m.start}; ${m.copies.length} copies under ${m.root}`);
    for (const c of m.copies) console.log(`  ${c.name}: ${Object.entries(c.subtrees).map(([p, t]) => `${p}@${t.slice(0, 8)}`).join(" ")}`);
  } else if (cmd === "delete" && rest.length === 1) {
    const r = deleteFrozen(rest[0]);
    console.log(`deleted ${r.deleted.length}; kept ${r.kept.length}${r.kept.length ? `: ${r.kept.join(", ")}` : ""}`);
  } else usage(LINE);
}
