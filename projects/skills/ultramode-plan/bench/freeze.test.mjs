import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deleteFrozen, freeze, slugOf } from "./freeze.mjs";
import { git, repoRoot, tmpRoot, twoCommitRepo } from "./testkit.mjs";

function setup(t) {
  const dir = tmpRoot(t);
  const repo = join(dir, "repo");
  mkdirSync(repo);
  const shas = twoCommitRepo(repo);
  const projectsDir = join(dir, "projects");
  mkdirSync(projectsDir);
  return { dir, repo, projectsDir, ...shas };
}

test("a copy holds the start commit's history and nothing after it, with no remote and no alternates", (t) => {
  const { dir, repo, projectsDir, start, later } = setup(t);
  const root = join(dir, "frozen");
  const m = freeze({ repo, commit: start, root, names: ["c1", "c2"], sparse: ["a"], projectsDir });
  assert.equal(m.start, start);
  for (const c of m.copies) {
    assert.throws(() => git(c.path, ["cat-file", "-e", later]), "a later commit must not resolve");
    assert.deepEqual(git(c.path, ["log", "--all", "--format=%H"]).trim().split("\n"), [start]);
    assert.equal(git(c.path, ["remote"]).trim(), "");
    assert.equal(existsSync(join(c.path, ".git", "objects", "info", "alternates")), false);
    // With no remote, a fetch has no source: git 2.53 exits 0 and brings nothing.
    try { git(c.path, ["fetch", "--all"]); } catch {}
    assert.deepEqual(git(c.path, ["log", "--all", "--format=%H"]).trim().split("\n"), [start], "a fetch brought nothing");
    assert.equal(readFileSync(join(c.path, "a", "one.txt"), "utf8"), "one\n");
    assert.equal(existsSync(join(c.path, "b")), false, "outside the sparse paths stays out");
    assert.equal(existsSync(join(c.path, "c.txt")), false);
    assert.equal(c.subtrees.a, git(repo, ["rev-parse", `${start}:a`]).trim());
    // Nothing in the copy's git folder points back at the base or the live repo.
    for (const f of ["config", "packed-refs", "FETCH_HEAD"]) {
      const p = join(c.path, ".git", f);
      if (!existsSync(p)) continue;
      const text = readFileSync(p, "utf8").toLowerCase().replace(/\\/g, "/");
      assert.ok(!text.includes(m.base.toLowerCase().replace(/\\/g, "/")), `${f} names the base`);
      assert.ok(!text.includes(repo.toLowerCase().replace(/\\/g, "/")), `${f} names the live repo`);
    }
    assert.equal(git(c.path, ["reflog"]).trim(), "", "the reflog names the base; it is emptied");
  }
  assert.equal(existsSync(join(m.base, "FETCH_HEAD")), false, "the base's FETCH_HEAD names the live repo");
});

test("every copy path has one length", (t) => {
  const { dir, repo, projectsDir, start } = setup(t);
  assert.throws(() => freeze({ repo, commit: start, root: join(dir, "frozen"), names: ["c1", "c22"], sparse: ["a"], projectsDir }), /differ in length/);
  assert.equal(existsSync(join(dir, "frozen")), false, "a refused freeze makes nothing");
});

test("a second project freezes at another commit with its own sparse paths", (t) => {
  const { dir, repo, projectsDir, start, later } = setup(t);
  const one = freeze({ repo, commit: start, root: join(dir, "frozen1"), names: ["c1"], sparse: ["a"], projectsDir });
  const two = freeze({ repo, commit: later, root: join(dir, "frozen2"), names: ["c1"], sparse: ["b", "c.txt"], projectsDir });
  const c = two.copies[0];
  assert.equal(git(c.path, ["rev-parse", "HEAD"]).trim(), later);
  assert.equal(readFileSync(join(c.path, "b", "two.txt"), "utf8"), "two\n");
  assert.equal(readFileSync(join(c.path, "c.txt"), "utf8"), "c\n");
  assert.equal(existsSync(join(c.path, "a")), false);
  assert.deepEqual(Object.keys(c.subtrees), ["b", "c.txt"]);
  assert.equal(one.copies[0].subtrees.a, git(repo, ["rev-parse", `${start}:a`]).trim());
});

test("a path whose Claude Code session folder already exists refuses", (t) => {
  const { dir, repo, projectsDir, start } = setup(t);
  const root = join(dir, "frozen");
  mkdirSync(join(projectsDir, slugOf(join(root, "c2")).toLowerCase()));
  assert.throws(() => freeze({ repo, commit: start, root, names: ["c1", "c2"], sparse: ["a"], projectsDir }), /session already ran in .*c2/);
  assert.equal(existsSync(root), false);
});

test("a root that exists, an unsafe character, a reserved name or a missing sparse path refuses", (t) => {
  const { dir, repo, projectsDir, start } = setup(t);
  mkdirSync(join(dir, "taken"));
  assert.throws(() => freeze({ repo, commit: start, root: join(dir, "taken"), names: ["c1"], sparse: ["a"], projectsDir }), /already exists/);
  assert.throws(() => freeze({ repo, commit: start, root: join(dir, "bad_root"), names: ["c1"], sparse: ["a"], projectsDir }), /character other than/);
  assert.throws(() => freeze({ repo, commit: start, root: join(dir, "f1"), names: ["base"], sparse: ["a"], projectsDir }), /base/);
  assert.throws(() => freeze({ repo, commit: start, root: join(dir, "f2"), names: ["c1"], sparse: ["nope"], projectsDir }), /does not exist/);
  assert.throws(() => freeze({ repo, commit: start, root: join(dir, "f3"), names: ["c1"], sparse: ["../a"], projectsDir }), /climbs out/);
});

test("a delete touches only the paths its manifest names", (t) => {
  const { dir, repo, projectsDir, start } = setup(t);
  const root = join(dir, "frozen");
  const m = freeze({ repo, commit: start, root, names: ["c1", "c2"], sparse: ["a"], projectsDir });
  writeFileSync(join(root, "keep.txt"), "planted\n");
  mkdirSync(join(root, "other"));
  mkdirSync(join(dir, "sibling"));
  const r = deleteFrozen(join(root, "manifest.json"));
  assert.equal(r.deleted.length, 3);
  for (const p of [m.base, ...m.copies.map((c) => c.path), join(root, "manifest.json")]) assert.equal(existsSync(p), false, `${p} is gone`);
  assert.deepEqual(readdirSync(root).sort(), ["keep.txt", "other"]);
  assert.ok(existsSync(join(dir, "sibling")));
});

test("a manifest naming a path outside its root deletes nothing", (t) => {
  const { dir, repo, projectsDir, start } = setup(t);
  const root = join(dir, "frozen");
  const m = freeze({ repo, commit: start, root, names: ["c1"], sparse: ["a"], projectsDir });
  const outside = join(dir, "victim");
  mkdirSync(outside);
  m.copies.push({ name: "x", path: outside, subtrees: {} });
  writeFileSync(join(root, "manifest.json"), JSON.stringify(m));
  assert.throws(() => deleteFrozen(join(root, "manifest.json")), /not directly under/);
  assert.ok(existsSync(outside));
  assert.ok(existsSync(m.copies[0].path), "nothing was deleted before the refusal");
});

test("the bench's start commit freezes with the Back Nine subtree a3678a83 and the repo's CE config", { timeout: 600_000 }, (t) => {
  const dir = tmpRoot(t);
  const repo = repoRoot();
  const projectsDir = join(dir, "projects");
  mkdirSync(projectsDir);
  const m = freeze({ repo, commit: "a3cd0b16", root: join(dir, "frozen"), names: ["c1"], sparse: ["projects/the-back-nine", ".compound-engineering"], projectsDir });
  const c = m.copies[0];
  assert.equal(m.start, "a3cd0b162b065b469327ff1f56dd78b33cd8c2c0");
  assert.equal(c.subtrees["projects/the-back-nine"].slice(0, 8), "a3678a83");
  assert.match(readFileSync(join(c.path, ".compound-engineering", "config.yaml"), "utf8"), /^cross_model_review_mode: off$/m);
  assert.equal(existsSync(join(c.path, "playbook")), false);
  // ec2c7694 committed build 2's own plan after the start: the head-to-head's copies must never resolve it.
  assert.throws(() => git(c.path, ["cat-file", "-e", "ec2c7694"]));
  deleteFrozen(join(m.root, "manifest.json"));
});
