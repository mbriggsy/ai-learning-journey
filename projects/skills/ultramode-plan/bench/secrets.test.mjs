import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { accountEmail, findSecrets, secretsOf, writeChecked } from "./secrets.mjs";
import { tmpRoot } from "./testkit.mjs";

const KEY = "sk-fixture-0123456789abcdefghij";
const env = { OPENAI_API_KEY: KEY, MY_TOKEN: 'tok"with\\escapes', client_secret: "s3cr3t-fixture-value", SHORT_PASS: "1", HOME_DIR: "C:/Users/fixture-not-a-secret", PATH: "/usr/bin" };
const email = "fixture.person@example.invalid";

test("a file holding a key-named variable's value is refused before it is written, naming the variable, never the value", (t) => {
  const p = join(tmpRoot(t), "out.json");
  assert.throws(
    () => writeChecked(p, `{"note": "${KEY}"}`, { env, email }),
    (e) => /OPENAI_API_KEY/.test(e.message) && !e.message.includes(KEY),
  );
  assert.equal(existsSync(p), false);
});

test("the account's email address is refused, in any letter case", (t) => {
  const p = join(tmpRoot(t), "out.json");
  assert.throws(() => writeChecked(p, `by ${email.toUpperCase()}`, { env, email }), (e) => /account email/.test(e.message) && !e.message.toLowerCase().includes(email));
  assert.equal(existsSync(p), false);
});

test("a value is found in its JSON-escaped form too", () => {
  const text = JSON.stringify({ v: env.MY_TOKEN });
  assert.deepEqual(findSecrets(text, { env, email }).hits, ["MY_TOKEN"]);
});

test("a clean file passes and is written, and a value too short to check is named, not skipped quietly", (t) => {
  const p = join(tmpRoot(t), "out.json");
  const r = writeChecked(p, '{"clean": true, "count": 1}', { env, email });
  assert.equal(readFileSync(p, "utf8"), '{"clean": true, "count": 1}');
  assert.deepEqual(r.unchecked, ["SHORT_PASS"]);
});

test("a variable whose name has none of the four words is not checked", () => {
  assert.deepEqual(findSecrets(`path ${env.HOME_DIR} and ${env.PATH}`, { env, email }).hits, []);
  assert.deepEqual(secretsOf(env).checked.map((s) => s.name).sort(), ["MY_TOKEN", "OPENAI_API_KEY", "client_secret"]);
});

test("a lower-case secret-named variable is checked too, named but never shown", (t) => {
  const p = join(tmpRoot(t), "out.json");
  assert.throws(() => writeChecked(p, "x s3cr3t-fixture-value y", { env, email }), (e) => /client_secret/.test(e.message) && !e.message.includes("s3cr3t"));
});

test("with no account email found the check refuses rather than skipping; email: false opts out explicitly", (t) => {
  assert.throws(() => findSecrets("clean", { env, email: null }), /email was not found/);
  assert.throws(() => findSecrets("clean", { env, email: "" }), /email was not found/);
  assert.deepEqual(findSecrets("clean", { env, email: false }).hits, []);
  const home = tmpRoot(t);
  assert.equal(accountEmail(home), null, "no account record");
  writeFileSync(join(home, ".claude.json"), JSON.stringify({ oauthAccount: { emailAddress: { nested: true } } }));
  assert.equal(accountEmail(home), null, "a field that is not an address");
  writeFileSync(join(home, ".claude.json"), JSON.stringify({ oauthAccount: { emailAddress: email } }));
  assert.equal(accountEmail(home), email);
});
