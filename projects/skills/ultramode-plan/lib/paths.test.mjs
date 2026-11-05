import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, realpathSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { existingBase, fromGitBash, longOf, samePath } from "./paths.mjs";
import { tmpRoot } from "../bench/testkit.mjs";

// These run on every platform: fromGitBash and samePath take the platform as an argument, so CI's
// ubuntu run checks the Windows reading too, and longOf's links are real ones.

test("fromGitBash reads a Git Bash drive path as its Windows drive, on Windows only", () => {
  assert.equal(fromGitBash("/c/Users/x.md", "win32"), "C:/Users/x.md");
  assert.equal(fromGitBash("/d/work", "win32"), "D:/work");
  assert.equal(fromGitBash("/c", "win32"), "C:/", "a bare drive is its root, never a drive-relative c:");
  assert.equal(fromGitBash("/c/", "win32"), "C:/");
  // Only a one-letter first segment is a drive.
  assert.equal(fromGitBash("/tmp/x", "win32"), "/tmp/x");
  assert.equal(fromGitBash("/cx/y", "win32"), "/cx/y");
  assert.equal(fromGitBash("C:\\Users\\x.md", "win32"), "C:\\Users\\x.md");
  assert.equal(fromGitBash("projects/c/x.md", "win32"), "projects/c/x.md");
  // Off Windows, /c/x is a folder named c.
  assert.equal(fromGitBash("/c/Users/x.md", "linux"), "/c/Users/x.md");
});

test("samePath ignores letter case on Windows alone", () => {
  assert.equal(samePath("C:\\A\\b.md", "c:\\a\\B.MD", "win32"), true);
  assert.equal(samePath("/a/b.md", "/A/b.md", "linux"), false);
  assert.equal(samePath("/a/b.md", "/a/b.md", "linux"), true);
  assert.equal(samePath("projects/p/new.md", "projects/p/other.md", "win32"), false);
});

test("longOf follows a link to its target and keeps a part that does not exist yet as given", (t) => {
  const root = realpathSync.native(tmpRoot(t));
  const real = join(root, "real");
  mkdirSync(join(real, "sub"), { recursive: true });
  const link = join(root, "link");
  symlinkSync(real, link, process.platform === "win32" ? "junction" : "dir");
  assert.equal(longOf(join(link, "sub")), join(real, "sub"));
  assert.equal(longOf(join(link, "sub", "new", "plan.md")), join(real, "sub", "new", "plan.md"));
  assert.deepEqual(existingBase(join(real, "sub", "a", "b")), { base: join(real, "sub"), rest: ["a", "b"] });
  assert.equal(longOf(resolve(root)), root);
});
