import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT_ENV, accountEmail, findSecrets, readEnvFile, secretsOf, writeChecked } from "./secrets.mjs";
import { repoRoot, tmpRoot } from "./testkit.mjs";

const KEY = "sk-fixture-0123456789abcdefghij";
const env = { OPENAI_API_KEY: KEY, MY_TOKEN: 'tok"with\\escapes', client_secret: "s3cr3t-fixture-value", SHORT_PASS: "1", HOME_DIR: "C:/Users/fixture-not-a-secret", PATH: "/usr/bin" };
const email = "fixture.person@example.invalid";

test("the repo-root .env's secret-named lines are checked too: quoted or exported, with CRLF endings, named as the file's", (t) => {
  const dir = tmpRoot(t);
  const envFile = join(dir, ".env");
  const fileKey = "gem-fixture-abcdefghijklmnop";
  writeFileSync(envFile, ["# a comment", "", `GEMINI_API_KEY=${fileKey}`, 'export CF_API_TOKEN="cf-fixture-quoted-1234"', "SPARE_PASS='short'", "PLAIN_SETTING=a-long-value-that-is-not-secret", `OPENAI_API_KEY=${KEY}`, "not a line"].join("\r\n") + "\r\n");
  assert.deepEqual(readEnvFile(envFile), { GEMINI_API_KEY: fileKey, CF_API_TOKEN: "cf-fixture-quoted-1234", SPARE_PASS: "short", PLAIN_SETTING: "a-long-value-that-is-not-secret", OPENAI_API_KEY: KEY });
  const p = join(dir, "out.json");
  assert.throws(() => writeChecked(p, `{"v": "${fileKey}"}`, { env, email, envFile }), (e) => /GEMINI_API_KEY \(repo-root \.env\)/.test(e.message) && !e.message.includes(fileKey));
  assert.equal(existsSync(p), false);
  assert.deepEqual(findSecrets("x cf-fixture-quoted-1234 y", { env, email, envFile }).hits, ["CF_API_TOKEN (repo-root .env)"], "the value without its quotes");
  assert.deepEqual(findSecrets("x a-long-value-that-is-not-secret y", { env, email, envFile }).hits, []);
  const s = secretsOf(env, { envFile });
  assert.ok(s.unchecked.includes("SPARE_PASS (repo-root .env)"));
  assert.equal(s.checked.filter((c) => c.name.startsWith("OPENAI_API_KEY")).length, 1, "the same value in the environment and the file is one check");
  assert.deepEqual(findSecrets(`${fileKey}`, { env, email, envFile: false }).hits, [], "envFile: false leaves the file out");
  assert.deepEqual(findSecrets(`${fileKey}`, { env, email, envFile: join(dir, "missing.env") }).hits, [], "no file, nothing to add");
});

test("a .env value is read short of a trailing comment, after its closing quote, and at the first #", (t) => {
  const envFile = join(tmpRoot(t), ".env");
  writeFileSync(envFile, ["INLINE_KEY=sk-inline-123456789 # rotated in May", 'QUOTED_KEY="sk-quoted-123456789" # note', "HASH_TOKEN=abcdefgh#ijkl", "SPACED_SECRET = 'sk spaced 123456' ", 'OPEN_KEY="sk-open-123456789', "HASHLEAD_KEY=#fixture-value-0123456789"].join("\n"));
  assert.deepEqual(readEnvFile(envFile), { INLINE_KEY: "sk-inline-123456789", QUOTED_KEY: "sk-quoted-123456789", HASH_TOKEN: "abcdefgh", SPACED_SECRET: "sk spaced 123456", OPEN_KEY: "sk-open-123456789", HASHLEAD_KEY: "#fixture-value-0123456789" });
  assert.deepEqual(findSecrets("leak: #fixture-value-0123456789 end", { env: {}, email, envFile }).hits, ["HASHLEAD_KEY (repo-root .env)"], "a value starting with # keeps bash's reading, never an empty one");
  assert.deepEqual(findSecrets("leak: sk-inline-123456789 end", { env: {}, email, envFile }).hits, ["INLINE_KEY (repo-root .env)"], "the comment never joins the value, so the bare value is caught");
  assert.deepEqual(findSecrets("leak: abcdefgh#ijkl end", { env: {}, email, envFile }).hits, ["HASH_TOKEN (repo-root .env)"], "the longer reading holds the shorter");
});

test("the default .env is the repo root's", () => {
  assert.equal(ROOT_ENV.toLowerCase(), join(repoRoot(), ".env").toLowerCase());
});

test("a file holding a key-named variable's value is refused before it is written, naming the variable, never the value", (t) => {
  const p = join(tmpRoot(t), "out.json");
  assert.throws(
    () => writeChecked(p, `{"note": "${KEY}"}`, { env, email, envFile: false }),
    (e) => /OPENAI_API_KEY/.test(e.message) && !e.message.includes(KEY),
  );
  assert.equal(existsSync(p), false);
});

test("the account's email address is refused, in any letter case", (t) => {
  const p = join(tmpRoot(t), "out.json");
  assert.throws(() => writeChecked(p, `by ${email.toUpperCase()}`, { env, email, envFile: false }), (e) => /account email/.test(e.message) && !e.message.toLowerCase().includes(email));
  assert.equal(existsSync(p), false);
});

test("a value is found in its JSON-escaped form too", () => {
  const text = JSON.stringify({ v: env.MY_TOKEN });
  assert.deepEqual(findSecrets(text, { env, email, envFile: false }).hits, ["MY_TOKEN"]);
});

test("a clean file passes and is written, and a value too short to check is named, not skipped quietly", (t) => {
  const p = join(tmpRoot(t), "out.json");
  const r = writeChecked(p, '{"clean": true, "count": 1}', { env, email, envFile: false });
  assert.equal(readFileSync(p, "utf8"), '{"clean": true, "count": 1}');
  assert.deepEqual(r.unchecked, ["SHORT_PASS"]);
});

test("a variable whose name has none of the four words is not checked", () => {
  assert.deepEqual(findSecrets(`path ${env.HOME_DIR} and ${env.PATH}`, { env, email, envFile: false }).hits, []);
  assert.deepEqual(secretsOf(env, { envFile: false }).checked.map((s) => s.name).sort(), ["MY_TOKEN", "OPENAI_API_KEY", "client_secret"]);
});

test("a lower-case secret-named variable is checked too, named but never shown", (t) => {
  const p = join(tmpRoot(t), "out.json");
  assert.throws(() => writeChecked(p, "x s3cr3t-fixture-value y", { env, email, envFile: false }), (e) => /client_secret/.test(e.message) && !e.message.includes("s3cr3t"));
});

test("with no account email found the check refuses rather than skipping; email: false opts out explicitly", (t) => {
  assert.throws(() => findSecrets("clean", { env, email: null, envFile: false }), /email was not found/);
  assert.throws(() => findSecrets("clean", { env, email: "", envFile: false }), /email was not found/);
  assert.deepEqual(findSecrets("clean", { env, email: false, envFile: false }).hits, []);
  const home = tmpRoot(t);
  assert.equal(accountEmail(home), null, "no account record");
  writeFileSync(join(home, ".claude.json"), JSON.stringify({ oauthAccount: { emailAddress: { nested: true } } }));
  assert.equal(accountEmail(home), null, "a field that is not an address");
  writeFileSync(join(home, ".claude.json"), JSON.stringify({ oauthAccount: { emailAddress: email } }));
  assert.equal(accountEmail(home), email);
});
