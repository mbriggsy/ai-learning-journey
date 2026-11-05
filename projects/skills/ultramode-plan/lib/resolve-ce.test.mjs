import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CE_FILES, PLUGIN, changedInPlace, checkResolution, fileOf, inlineSeats, resolveCe, sameResolution } from "./resolve-ce.mjs";
import { tmpRoot, writeAt } from "../bench/testkit.mjs";
import { MEASURED, SHA_NEW, SHA_OLD, ceEntry, ceInstall, registryAt } from "./fixtures/ce-fixture.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

test("the fixture is the measured registry shape: version 2, each plugin a list of installs with these fields", () => {
  assert.equal(MEASURED.version, 2);
  const ce = MEASURED.plugins[PLUGIN];
  assert.equal(ce.length, 1);
  assert.deepEqual(Object.keys(ce[0]).sort(), ["gitCommitSha", "installPath", "installedAt", "lastUpdated", "scope", "version"]);
  assert.equal(ce[0].gitCommitSha, SHA_NEW);
  // One install measured with no gitCommitSha at all: the field cannot be assumed.
  assert.ok(Object.values(MEASURED.plugins).flat().some((e) => !("gitCommitSha" in e)));
});

test("a registry pointing at 3.34.0 reads 3.34.0's files, never the 3.14.3 folder beside it", (t) => {
  const root = tmpRoot(t);
  ceInstall(root, "3.14.3");
  const install = ceInstall(root, "3.34.0");
  const r = resolveCe({ registry: registryAt(root, [ceEntry(install, SHA_OLD, "3.34.0")]) });
  assert.equal(r.absent, null);
  assert.equal(r.commit, SHA_OLD);
  assert.equal(r.installPath, install);
  assert.equal(r.version, "3.34.0");
  assert.equal(r.files.length, CE_FILES.length);
  for (const f of r.files) {
    assert.ok(f.path.startsWith(install), `${f.key} read from ${f.path}`);
    assert.equal(f.sha256, sha256(`# ${f.key} at 3.34.0\n`), `${f.key} hashed the wrong bytes`);
    assert.ok(!("missing" in f));
  }
});

test("no CE entry reads as CE absent, and every seat in ran comes back inline with a null commit", (t) => {
  const root = tmpRoot(t);
  const r = resolveCe({ registry: registryAt(root, undefined) });
  assert.equal(r.commit, null);
  assert.match(r.absent, /no compound-engineering@every-marketplace entry/);
  assert.ok(r.files.every((f) => f.missing === "CE absent" && !("sha256" in f)));
  const ran = ["write", "coherence", "adversarial", "architecture-strategist", "premise"];
  assert.deepEqual(inlineSeats(r, ran), [
    { seat: "write", file: "skills/ce-plan/references/plan-sections.md", commit: null },
    { seat: "coherence", file: "skills/ce-doc-review/references/personas/coherence-reviewer.md", commit: null },
    { seat: "adversarial", file: "skills/ce-doc-review/references/personas/adversarial-document-reviewer.md", commit: null },
    { seat: "architecture-strategist", file: "skills/ce-plan/references/agents/architecture-strategist.md", commit: null },
  ]);
  assert.equal(fileOf(r, "coherence"), null);
});

test("of two installs with different scopes, the user-scope one wins, whatever the order", (t) => {
  const root = tmpRoot(t);
  const project = ceInstall(root, "3.14.3");
  const user = ceInstall(root, "3.35.3");
  for (const entries of [[ceEntry(project, SHA_OLD, "3.14.3", "project"), ceEntry(user, SHA_NEW, "3.35.3")], [ceEntry(user, SHA_NEW, "3.35.3"), ceEntry(project, SHA_OLD, "3.14.3", "local")]]) {
    const r = resolveCe({ registry: registryAt(root, entries) });
    assert.equal(r.commit, SHA_NEW);
    assert.equal(r.installPath, user);
  }
});

test("a missing persona or agent file is listed as missing, every other one with its sha256", (t) => {
  const root = tmpRoot(t);
  const install = ceInstall(root, "3.35.3", { missing: ["design", "performance-oracle"] });
  const r = resolveCe({ registry: registryAt(root, [ceEntry(install, SHA_NEW, "3.35.3")]) });
  const missing = r.files.filter((f) => "missing" in f);
  assert.deepEqual(missing.map((f) => [f.key, f.missing]), [["design", "not in the install"], ["performance-oracle", "not in the install"]]);
  assert.equal(r.files.filter((f) => "sha256" in f).length, CE_FILES.length - 2);
  assert.deepEqual(inlineSeats(r, ["design", "coherence", "performance-oracle"]), [
    { seat: "design", file: "skills/ce-doc-review/references/personas/design-lens-reviewer.md", commit: SHA_NEW },
    { seat: "performance-oracle", file: "skills/ce-plan/references/agents/performance-oracle.md", commit: SHA_NEW },
  ]);
  // A seat that did not run is never named, even when its file is missing.
  assert.deepEqual(inlineSeats(r, ["coherence"]), []);
  assert.deepEqual(fileOf(r, "coherence"), { path: join(install, "skills", "ce-doc-review", "references", "personas", "coherence-reviewer.md"), sha256: sha256("# coherence at 3.35.3\n") });
  assert.throws(() => fileOf(r, "whole-doc"), /no CE file is keyed "whole-doc"/);
});

test("a registry in another shape, or a CE install it cannot name, reads as CE absent with its reason", (t) => {
  const root = tmpRoot(t);
  const install = ceInstall(root, "3.35.3");
  const cases = [
    [registryAt(root, [ceEntry(install, SHA_NEW, "3.35.3")], { version: 3 }), /not in the measured shape .*version 3/],
    [registryAt(root, [{ ...ceEntry(install, SHA_NEW, "3.35.3"), gitCommitSha: undefined }]), /no full gitCommitSha/],
    [registryAt(root, [ceEntry(install, "799ac9a", "3.35.3")]), /no full gitCommitSha \(got "799ac9a"\)/],
    [registryAt(root, [ceEntry("relative/3.35.3", SHA_NEW, "3.35.3")]), /no absolute installPath/],
    [registryAt(root, [ceEntry(join(root, "gone"), SHA_NEW, "3.35.3")]), /is not a folder on disk/],
    [registryAt(root, [ceEntry(install, SHA_NEW, "3.35.3"), ceEntry(install, SHA_NEW, "3.35.3")]), /2 user-scope .* installs, and which one a session loads is unmeasured/],
    [registryAt(root, [ceEntry(install, SHA_NEW, "3.35.3", "project")]), /no user-scope .* install \(scopes: "project"\)/],
    [join(root, "nowhere.json"), /there is no plugin registry/],
  ];
  for (const [registry, why] of cases) {
    const r = resolveCe({ registry });
    assert.equal(r.commit, null, String(why));
    assert.match(r.absent, why);
    assert.equal(r.files.length, CE_FILES.length);
  }
  const bad = join(root, "bad.json");
  writeFileSync(bad, "{ not json");
  assert.match(resolveCe({ registry: bad }).absent, /does not parse/);
});

test("two resolutions match only on the same commit and bytes; a file changed under one commit is named", (t) => {
  const root = tmpRoot(t);
  const install = ceInstall(root, "3.35.3");
  const registry = registryAt(root, [ceEntry(install, SHA_NEW, "3.35.3")]);
  const a = resolveCe({ registry });
  assert.ok(sameResolution(a, resolveCe({ registry })));
  writeAt(join(install, "skills", "ce-plan", "references", "research.md"), "# changed in place\n");
  const b = resolveCe({ registry });
  assert.ok(!sameResolution(a, b));
  assert.deepEqual(changedInPlace(a, b), ["skills/ce-plan/references/research.md"]);
  const absent = resolveCe({ registry: registryAt(root, undefined) });
  assert.ok(sameResolution(absent, resolveCe({ registry: registryAt(root, undefined) })));
  assert.ok(!sameResolution(a, absent));
  assert.deepEqual(changedInPlace(a, absent), []);
});

test("a resolution read back is checked: its file list, and exactly one of sha256 and missing per file", (t) => {
  const root = tmpRoot(t);
  const r = resolveCe({ registry: registryAt(root, [ceEntry(ceInstall(root, "3.35.3"), SHA_NEW, "3.35.3")]) });
  assert.equal(checkResolution(structuredClone(r)).commit, SHA_NEW);
  assert.throws(() => checkResolution({ ...r, files: r.files.slice(1) }), /lists the files/);
  assert.throws(() => checkResolution({ ...r, files: r.files.map((f, i) => (i === 0 ? { ...f, missing: "x" } : f)) }), /exactly one of sha256 and missing/);
  assert.throws(() => checkResolution({ ...r, commit: "799ac9a" }), /full git sha/);
  assert.throws(() => checkResolution({ ...r, absent: "and present" }), /either a commit or absent/);
});

test("the command prints the resolution for a given registry, and with no command prints its usage", (t) => {
  const root = tmpRoot(t);
  const registry = registryAt(root, [ceEntry(ceInstall(root, "3.35.3"), SHA_NEW, "3.35.3")]);
  const r = spawnSync(process.execPath, [join(here, "resolve-ce.mjs"), "resolve", registry], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.commit, SHA_NEW);
  assert.equal(out.files.length, CE_FILES.length);
  const u = spawnSync(process.execPath, [join(here, "resolve-ce.mjs"), "show"], { encoding: "utf8" });
  assert.equal(u.status, 2);
  assert.match(u.stderr, /^usage: /);
});
