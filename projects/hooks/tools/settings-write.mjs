#!/usr/bin/env node
// settings-write.mjs: the one writer for ~/.claude/settings.json (and any
// settings.local.json, through --file) and, key by key, for ~/.claude.json
// (KTD 14). Every settings change goes through it: re-read under a lock,
// patch, write UTF-8 with no BOM to a temp file, rename, re-read and check.
//
// Why one writer: on 2026-10-16 a tool read settings.json as Windows-1252 and
// wrote it back as UTF-8, and every em dash turned into "â€”" (mojibake). A
// hand edit or a tool's own rewrite can also reorder or reformat the file, so
// a diff no longer shows what changed. This writer refuses a damaged file
// (lib/encoding.mjs), keeps settings text pure ASCII so no cp1252 round trip
// can garble it again, changes only the paths a patch names, and records the
// ops that undo each write.
//
//   node settings-write.mjs --target settings|claude-json
//        (--patch <file> | --reformat | --apply-inverse <file>)
//        [--file <path>] [--expect-sha <sha256>] [--dry-run] [--diff]
//        [--inverse-out <file>] [--create] [--persist-check]
//        [--lock-wait-ms <n>] [--persist-delay-ms <n>]
//
// --target settings refuses a file that is the CLI's own config
// (~/.claude.json and the other places the CLI may keep it, by identity, or
// any file named .claude.json or .claude-<suffix>.json): that file is
// written with --target claude-json, under the CLI's lock, values unprinted.
// And the mirror: --target claude-json refuses a settings file (any file
// named settings*.json, or ~/.claude/settings.json or settings.local.json
// by identity), which --target settings writes under its own lock, the
// ASCII rule and the settings encoding check.
//
// Patch file: {"ops": [...]}. A path is an array of keys (strings) and array
// indices (numbers), never a dotted string: keys hold dots and slashes (model
// ids, project paths).
//   {"op": "test", "path": [...], "value": v}     the path holds v (deep-equal)
//   {"op": "test", "path": [...], "absent": true} the path does not exist
//   {"op": "test", "path": [...], "sha256": h}    the path holds a value whose
//                                                 hashValue() is h (how an
//                                                 inverse file tests a value it
//                                                 must not store)
//   {"op": "set", "path": [...], "value": v, "create": false, "after": k}
//        the parent must exist unless create is true (then missing objects
//        on the way are made). "after" places a NEW key right after sibling
//        key k (null: first); without it a new key goes last. Inverse files
//        use it so a rollback restores key order, and so the bytes.
//   {"op": "delete", "path": [...], "ifExists": false}
//   {"op": "push", "path": [...], "value": v, "unique": false}
//        the path must hold an array; unique skips a deep-equal duplicate
//   {"op": "replaceInStrings", "path": [...], "from": s, "to": t, "expectCount": n}
//        every occurrence in every string VALUE under the path (never a key);
//        a given expectCount must match the total exactly
// An unknown op or field is refused. Ops apply in order to a copy; any op
// that fails refuses the whole write (all or nothing).
//
// The procedure (both targets):
//   1. take the lock (below)  2. read the bytes; their sha256 is `before`
//   3. --expect-sha differing is exit 3, like step 10: the file is not the
//      one the caller read, so the caller reads it again and re-plans.
//      Refuse: a BOM or invalid UTF-8 (lib/encoding); text that is not
//      JSON.stringify(parsed, null, 2), plus "\n" exactly when the original
//      ended with one. Canonical input is what makes "bytes outside the
//      patch are unchanged" hold by construction: the writer re-serializes
//      the same way. --reformat is the one write that canonicalizes, alone
//      (with no ops).
//   4. apply the ops  5. serialize canonically, keeping the newline choice.
//      Mojibake (lib/encoding) left in the output is refused: a damaged file
//      is written only by a patch whose explicit ops repair every run. A
//      --reformat changes bytes, not values, so it keeps the runs it found
//      (never more), named in a warning: a file with a BOM or a
//      non-canonical layout AND mojibake is fixed by --reformat, then a
//      replaceInStrings patch.
//   6. settings only: the output must be pure ASCII (non-ASCII is refused,
//      naming each path; replaceInStrings is the fix). ~/.claude.json is
//      exempt: the CLI writes non-ASCII there itself.
//   7. output equal to input: "no change", exit 0, nothing written
//   8. --dry-run stops here  9. write <name>.sw-<pid>-<rand>.tmp beside the
//      target (UTF-8, no BOM), fsync  10. re-read the target: a sha256 other
//      than `before` is a concurrent change (exit 3, nothing written)
//  11. rename over the target, retrying EPERM/EBUSY/EACCES for ~3 s (Windows:
//      a reader without share-delete)  12. re-read: the bytes must be what
//      was written, parse, and (settings) be ASCII with no mojibake (a
//      --reformat: no more mojibake than it kept, non-ASCII allowed), else
//      exit 4  13. release the lock  14. claude-json always, settings with
//      --persist-check: ~1.5 s later, every changed path must still hold its
//      new value, else exit 4 ("clobbered by another writer").
//
// Locks. settings: our own lock file <target>.sw.lock (exclusive create,
// owner token inside; one older than 60 s is a crashed owner's and is broken
// by rename-aside-and-check, as probes/run.mjs withLock does). claude-json:
// the CLI's own lock, which we take exactly as the CLI does. Checked against
// the 2.1.307 binary (~/.local/bin/claude.exe, grep -a, 2026-10-21):
//   - the config save (`ei`) locks with
//     `yl(y,{lockfilePath:`${y}.lock`,...})`, y = getGlobalClaudeFile();
//     `yl` is proper-lockfile's lock();
//   - proper-lockfile's acquire is
//     `function be(e,r,n){let i=ne(e,r);r.fs.mkdir(i,(u)=>{...` with
//     `ne(e,r)=r.lockfilePath||`${e}.lock``: the lock is a DIRECTORY made by
//     mkdir, EEXIST meaning held;
//   - its defaults are `{stale:1e4,update:null,...}`, update = stale/2: the
//     CLI refreshes its lock's mtime every 5 s and breaks (rmdir) any lock
//     whose mtime is over 10 s old;
//   - on ELOCKED the CLI retries after r7s=[200,400,800,1600,3200,4000] ms
//     (times 1 to 2), and writes the file as JSON.stringify(c,null,2) with
//     mode 384 (0o600) and no trailing newline.
// So we mkdir <target>.lock, wait with backoff up to 10 s on EEXIST, and hold
// it for well under the CLI's 10 s stale age (milliseconds; the rename retry
// bounds it at ~3 s); we never refresh its mtime. A lock dir older than 30 s
// outlived any live owner (a live CLI refreshes it every 5 s): it is reported
// as stale, exit 5, never broken by us. We remove only the dir we made, and
// only while it is still the same dir (inode, birth, modify and change
// times). Nothing is ever put inside it: the CLI breaks a stale lock with
// rmdir, which a non-empty dir would fail.
//
// Output: one JSON object on stdout, {ok, exit, target, file, before, after,
// written, noop, dryRun, changes: [{op, path, note, old?, new?, count?,
// strings?}], warnings, inverse, diff?, persisted?, error?, locations?,
// clobbered?, irreversible?}. before and after are sha256s of the file's
// bytes; after is set only for bytes written (or, on a dry run, that would
// be). written is true from the rename on, so an exit 4 says written: true.
// Values are never printed for
// claude-json: a changed value shows as {type, length, sha8}. For settings,
// a value under an "env" key or a secret-shaped one shows the same way, and
// so does an array item right after a secret flag (["--api-key", v]).
// Secret-shaped (secretShaped, below): a key on its path named like key,
// token, secret, auth or with a _PASS, _PWD or HEADERS suffix, or whose own
// text holds a secret; or a string holding, anywhere in it, a known token
// prefix (sk-, ghp_, ...), a Bearer token, a Basic credential, a KEY=value
// or password assignment, a --password value, a key or token flag's value,
// an X-Api-Key style header, a JWT, an Azure SAS signature (sig= in a URL),
// or user:password@ in a URL; or an argument list holding a secret flag's
// value. --diff (in the result's "diff") gives
// a unified line diff of the settings text in which a line inside env
// reads "~ env.<KEY> changed" (or added, removed, or unchanged when only its
// trailing comma moved), a secret-shaped line elsewhere "~ <path as JSON>
// changed" (and so on), and an unchanged context line "~ env.<KEY>" or
// "~ <path>". An opening line ("<key>": {) hides the same way when its key
// holds a secret, and a label never prints such a key: it reads
// <secret-shaped key sha8> in its place. Errors also go to stderr, with the
// exit code.
//
// Exit codes: 0 written, no change, or dry run; 1 internal error; 2 refused
// (bad patch or arguments, an unknown op or argument however it is spelled,
// failed test op, damaged or non-canonical input, non-ASCII settings
// output, expectCount mismatch, irreversible inverse op, a settings target
// that is the CLI's own config, a claude-json target that is a settings
// file); 3 the file is not the one the caller read: --expect-sha differs,
// or it changed before the rename (nothing written either way; read it
// again and re-plan); 4 written, but the post-write check failed or a later
// re-read shows it clobbered; 5 lock busy or stale.
//
// Inverse ops (rollback). A write also writes --inverse-out (default
// ~/.claude/flow/settings-writer/<UTC stamp>-<target>-inverse.json):
// {inverseOf: {target, file, before, after, at}, ops}. Each op that restores
// a value is preceded by a test that the value is still what this write left
// there, so a rollback refuses if anything changed it since. A secret-shaped
// old value is never stored: it becomes {"redacted": true, "sha256": ...}
// and its op is marked "irreversible" (an array is one value, so a list
// holding one rule with a token makes the whole list's restore
// irreversible); --apply-inverse refuses such a file,
// naming those paths, and applies none of it. A new value under env or a
// secret-shaped one is tested by sha256, never stored. The inverse is checked
// before anything is written: applied to the new document it must give back
// the original bytes, or the write is refused as an internal error. A
// --reformat changes bytes, not values, so it has no inverse ops and writes
// no inverse file (a warning says so).
//
// Library: the CLI is a thin shell over settingsWrite(), which deploy.mjs and
// later units call directly:
//
//   import { settingsWrite } from './tools/settings-write.mjs';
//   const res = await settingsWrite({
//     target: 'settings',            // or 'claude-json'
//     file,                          // default: the target's default path
//     ops,                           // an op array, or patch: {ops}
//     reformat, applyInverse,        // the other two modes (a file path)
//     expectSha, dryRun, diff, create, persistCheck,
//     inverseOut,                    // default under ~/.claude/flow
//     lockWaitMs, persistDelayMs,    // 10 000 and 1 500 by default
//     seams,                         // tests only, below
//   });
//   // res is exactly the object the CLI prints; res.exit is its exit code.
//
// It never throws: every failure comes back as {ok: false, exit, error}. A
// caller that read the file to plan its ops passes that read's sha256 as
// expectSha; exit 3 then means "changed since you read it: read again and
// re-plan", whichever check caught it, and res.before is the sha it found.
// `seams` lets a test act at a precise point instead of racing a sleep:
// {beforeRename(file) (before the concurrent-change check), afterCheck(file)
// (after it, just before the rename or link), afterRename(file),
// beforePersistCheck(file)}, each awaited. Nothing else reads it.

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findMojibake, isAscii, scanEncoding } from '../lib/encoding.mjs';

export const EXIT = Object.freeze({ OK: 0, INTERNAL: 1, REFUSED: 2, CONCURRENT: 3, POSTCHECK: 4, LOCK: 5 });
export const TARGETS = Object.freeze(['settings', 'claude-json']);

const IS_WIN = process.platform === 'win32';
const SETTINGS_LOCK_STALE_MS = 60_000;
const CLI_LOCK_STALE_MS = 30_000;
const RENAME_RETRY_MS = 3_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const span = (ms) => (ms >= 1000 ? `${Math.round(ms / 1000)} s` : `${ms} ms`);
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const fmt = (p) => JSON.stringify(p);

// A failure with its exit code. `extra` joins the result (locations, ...).
class Stop extends Error {
  constructor(exit, message, extra = {}) {
    super(message);
    this.exit = exit;
    this.extra = extra;
  }
}
const refuse = (message, extra) => new Stop(EXIT.REFUSED, message, extra);

// ---------------------------------------------------------------- JSON values

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

// An own data property, never the __proto__ setter: JSON.parse makes a key
// named "__proto__" an ordinary own key, and a write must keep it one.
function put(o, k, v) {
  Object.defineProperty(o, k, { value: v, writable: true, enumerable: true, configurable: true });
}

const cloneJson = (v) => JSON.parse(JSON.stringify(v));

// A value JSON can hold and give back unchanged: no undefined, function,
// NaN, Infinity, class instance or cycle.
function isJsonValue(v, seen = new Set()) {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v !== 'object' || seen.has(v)) return false;
  if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) return false;
  seen.add(v);
  const ok = Array.isArray(v) ? v.every((x) => isJsonValue(x, seen)) : Object.values(v).every((x) => isJsonValue(x, seen));
  seen.delete(v);
  return ok;
}

// JSON equality, as a JSON-patch test reads it: object key order doesn't
// matter, array order does.
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
}

// JSON with object keys sorted, so equal values hash equal whatever their
// key order.
function stableStringify(v) {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (isObj(v)) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

// The hash a {"op": "test", "sha256"} op and a redacted value carry.
export const hashValue = (v) => sha256(stableStringify(v));

// The one serialization the writer reads and writes.
export const canonicalText = (doc, newline) => `${JSON.stringify(doc, null, 2)}${newline ? '\n' : ''}`;

// What a value is, without what it says: for output that must never carry a
// value.
export function describe(v) {
  if (v === undefined) return null;
  const length = typeof v === 'string' || Array.isArray(v) ? v.length : isObj(v) ? Object.keys(v).length : JSON.stringify(v).length;
  return { type: typeOf(v), length, sha8: hashValue(v).slice(0, 8) };
}

// ---------------------------------------------------------------- secrets

// A key name that marks its value secret, as a path segment or a nested key.
// The three suffixes catch names none of the words flags: DB_PASS, SMTP_PWD,
// OTEL_EXPORTER_OTLP_HEADERS, and the "headers" object of an MCP server or
// an http hook, which carries an Authorization value. (Not a bare PWD: that
// is the working directory.)
const SECRET_SEGMENT = /key|token|secret|passw|auth|credential|bearer|cookie|_pass$|_pwd$|headers$/i;

// A string is secret when it holds a secret ANYWHERE, not only at its start:
// a permission rule or a hook command can carry one inline, as in
// Bash(curl -H "Authorization: Bearer ghp_...") or KEY=sk-... node x. So:
//  - a known secret prefix starting the string (any length, as before), or
//    after a character that is not a letter, digit or underscore and followed
//    by 16+ token characters. A real key always has that tail (AKIA's is
//    exactly 16; ghp_'s 36); prose that names a prefix ("sk- keys", in an
//    autoMode rule) does not, and "task-runner" holds no "sk-" at all;
//  - Bearer and a literal token of 20+ characters ("Bearer $TOKEN" is a
//    variable the shell fills in, not a secret);
//  - Basic, as a word, and a base64 token of 16+ characters: HTTP Basic auth
//    (Authorization: Basic <user:password in base64>), the same secret as
//    user:password@ in a URL, since base64 hides nothing. Prose ("Basic
//    usage") has no such token after it, and "Basic $CREDS" is a variable.
//    The cost: a user:password of 11 characters or fewer encodes to under
//    16 base64 characters (padding aside), and passes;
//  - NAME=value where NAME holds KEY, TOKEN or SECRET at most 64 name
//    characters before the =, and the value runs 12+ characters with no $
//    (API_KEY=$API_KEY is a reference);
//  - a password assignment: NAME=value where NAME holds PASSW at most 64
//    name characters before the = (PGPASSWORD, DB_PASSWORD, --password=)
//    or ends in _PASS or _PWD (DB_PASS, MYSQL_PWD), and the value runs 6+
//    characters with no $. A password is often short, so its floor is
//    lower than a key's. Not a bare PASS or PWD: BYPASS=true and PWD=/c/x
//    hold no secret;
//  - --pass, --passwd or --password, then a space or =, then a value of 5+
//    characters that is not a $variable or the next --flag;
//  - a dash flag naming a key, token, secret or password (--account-key,
//    --auth-token, --client-secret) followed by a space or = and a value of
//    16+ characters from [A-Za-z0-9+/=_-] that runs to the end of the
//    argument (TOKEN_VALUE): a space, a quote, a bracket, one of ,;&|<> or
//    a colon. The colon is an allow rule's :* suffix: "always allow" saves
//    the exact command, so Bash(cli --token <v>:*) holds the token. A path
//    holding a . doesn't match (--key-file keys/x.pem), nor a drive path
//    (D:/keys/x has one letter before its colon), nor one starting ~ or .,
//    a value never starts with - (that is the next flag), and
//    "monkeytype-cli" is no dash flag. A dotless path of 16+ characters
//    does match (--password-file /run/secrets/database), as does a
//    host:path whose host runs 16+ characters: the cheap side, a masked
//    value;
//  - a header naming a key or token (X-Api-Key: <v>, X-Auth-Token: <v>):
//    the word, a colon (spaces around it allowed), then the same 16+ token
//    characters, ending the same way. A colon it must be: Bash(rg "token"
//    some/dir) is no header;
//  - a JWT, which the two rules above miss at its first dot (--token <jwt>,
//    apikey: <jwt>): eyJ (base64url for {"), 8+ more header characters, a
//    dot, 8+ payload characters, a dot, then the signature (empty for an
//    unsigned token). It starts only where no token character and no -
//    comes right before it. At a plain word boundary every eyJ in a long
//    run of "eyJ-" would scan the run again (measured: 2.4 s for 100 KB);
//  - an Azure SAS signature: sig= after ? or &, then 16+ characters of
//    URL-encoded base64 (a SAS URL for azcopy or curl; its other fields,
//    sv=, se=, sp=, hold no secret);
//  - user:password@ in a URL (a DATABASE_URL, a proxy), which no key name
//    flags.
// A false match costs a masked value and an irreversible inverse op (a
// rollback refuses it by name). A miss costs a secret printed and stored.
// So each rule names its secret narrowly, and the live settings strings
// gained no new match when the password, flag and header rules came in,
// nor when the JWT, SAS and colon rules did (both checked 2026-10-22, paths
// only). One test for every caller: shown(), the inverse's restore(),
// --diff's hidden() and deploy.mjs all ask secretShaped(). Name parts are
// bounded ({0,40} in a flag, {0,64} before a NAME='s =; round 2 left KEY's
// unbounded, and a 200 KB "KEYKEY..." took 3.9 s), and the JWT rule starts
// only where a token can, so no long string can make a rule backtrack for
// long: a test times 200 KB strings shaped against each rule.
const PREFIXES = 'sk[-_]|ctx7sk|gh[pousr]_|github_pat_|xox|AIza|AKIA';
const SECRET_PREFIX = new RegExp(`^(?:${PREFIXES})|[^A-Za-z0-9_](?:${PREFIXES})[A-Za-z0-9_-]{16,}`);
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/-]{20,}/i;
const BASIC = /\bBasic\s+[A-Za-z0-9+/]{16,}={0,2}/i;
const ASSIGNED_SECRET = /(?:KEY|TOKEN|SECRET)\w{0,64}\s*=\s*['"]?[^\s'"$]{12,}/i;
const ASSIGNED_PASSWORD = /(?:PASSW\w{0,64}|_PASS|_PWD)\s*=\s*['"]?[^\s'"$]{6,}/i;
const PASSWORD_FLAG = /--pass(?:wd|word)?(?:=|\s+)['"]?[^\s'"$-][^\s'"$]{4,}/i;
const TOKEN_VALUE = "[A-Za-z0-9+/=_][A-Za-z0-9+/=_-]{15,}(?=$|[\\s'\"`)\\]},;:&|<>])";
const FLAG_SECRET = new RegExp(`(?:^|[\\s"'(])--?[\\w-]{0,40}(?:key|token|secret|passw)[\\w-]{0,40}(?:=|\\s+)['"]?${TOKEN_VALUE}`, 'i');
const HEADER_SECRET = new RegExp(`(?:key|token)\\s*:\\s*${TOKEN_VALUE}`, 'i');
const JWT = /(?<![\w-])eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]*/;
const SAS_SIGNATURE = /[?&]sig=[A-Za-z0-9%+/=]{16,}/i;
const URL_CREDENTIAL = /:\/\/[^/\s:@]+:[^/\s@]+@/;

const STRING_RULES = [SECRET_PREFIX, BEARER, BASIC, ASSIGNED_SECRET, ASSIGNED_PASSWORD, PASSWORD_FLAG, FLAG_SECRET, HEADER_SECRET, JWT, SAS_SIGNATURE, URL_CREDENTIAL];
const secretString = (s) => STRING_RULES.some((re) => re.test(s));

// A key that marks what it holds secret: by its name (SECRET_SEGMENT), or
// because the key's own text holds a secret (a URL with a password, a token
// used as a key), which no name rule sees.
const secretKey = (k) => typeof k === 'string' && (SECRET_SEGMENT.test(k) || secretString(k));

// An argument list carries a secret flag's value as the NEXT item, as in an
// MCP server's args: ["--api-key", "<v>"]. Neither item is secret-shaped on
// its own, so the pair is judged together. The flag is an item that is one
// dash flag naming a key, token, secret, password or auth; its value is the
// next item unless that is empty, the next -flag or a $variable (the CLI
// fills in ${VAR}).
const FLAG_ITEM = /^--?[\w-]{0,40}(?:key|token|secret|passw|auth)[\w-]{0,40}$/i;
const flagBefore = (arr, i) => Number.isInteger(i) && i > 0 && typeof arr[i - 1] === 'string' && FLAG_ITEM.test(arr[i - 1]);
const flagValue = (x) => typeof x === 'string' && x !== '' && !/^[-$]/.test(x);
const afterSecretFlag = (arr, i) => Array.isArray(arr) && flagBefore(arr, i) && flagValue(arr[i]);
// What applyOne adds to the record of a change to item i of arr.
const afterFlagMark = (arr, i) => (flagBefore(arr, i) ? { afterFlag: true } : {});

// True when a value must never be stored or printed: a key on its path is
// secret (by name or by its own text), or anything inside it is (such a
// key, a string holding a secret as secretString reads it, or an array item
// right after a secret flag). Deep, so deleting a whole object or array
// that holds a token never stores the token. (So an allow list holding one
// rule with a token gets an irreversible inverse op whenever a write
// changes the list.)
export function secretShaped(p, value) {
  if (p.some(secretKey)) return true;
  const walk = (v) => {
    if (typeof v === 'string') return secretString(v);
    if (Array.isArray(v)) return v.some((x, i) => walk(x) || afterSecretFlag(v, i));
    if (isObj(v)) return Object.entries(v).some(([k, x]) => secretKey(k) || walk(x));
    return false;
  };
  return walk(value);
}

// The path is an "env" object or sits inside one (settings' env, an MCP
// server's env).
const inEnv = (p) => p.includes('env');

// Some key anywhere inside the value is "env".
const holdsEnv = (v) => (Array.isArray(v) ? v.some(holdsEnv) : isObj(v) ? Object.entries(v).some(([k, x]) => k === 'env' || holdsEnv(x)) : false);

// A value output never shows and an inverse never tests by value: env
// values, and anything secret-shaped. (An inverse still STORES a non-secret
// old value under env, or a rollback could not restore it.)
const sensitive = (p, v) => inEnv(p) || holdsEnv(v) || secretShaped(p, v);

// ---------------------------------------------------------------- paths

function checkPath(p, where) {
  if (!Array.isArray(p)) throw refuse(`${where}: "path" must be an array of keys and indices`);
  p.forEach((s, i) => {
    if (typeof s === 'string') return;
    if (Number.isSafeInteger(s) && s >= 0) return;
    throw refuse(`${where}: path segment ${i + 1} must be a string key or a non-negative integer index, not ${JSON.stringify(s)}`);
  });
}

// {found, value, parent, key} for a path, or {found: false}. A segment of the
// wrong kind for its container (a number on an object, a string on an array)
// is a malformed path, not an absent one.
function lookup(doc, p) {
  let cur = doc;
  let parent = null;
  let key;
  for (let i = 0; i < p.length; i++) {
    const seg = p[i];
    if (Array.isArray(cur)) {
      if (typeof seg !== 'number') throw new OpError(`segment ${i + 1} is the key ${JSON.stringify(seg)}, but ${fmt(p.slice(0, i))} holds an array (index it with a number)`);
      if (seg >= cur.length) return { found: false };
    } else if (isObj(cur)) {
      if (typeof seg !== 'string') throw new OpError(`segment ${i + 1} is the index ${seg}, but ${fmt(p.slice(0, i))} holds an object (keys are strings)`);
      if (!Object.hasOwn(cur, seg)) return { found: false };
    } else return { found: false };
    parent = cur;
    key = seg;
    cur = cur[seg];
  }
  return { found: true, value: cur, parent, key };
}

class OpError extends Error {}

// Put a new key into an object right after `after` (null: first), keeping
// every other key's place.
function insertAfter(obj, key, value, after) {
  const entries = Object.entries(obj);
  let at = 0;
  if (after !== null) {
    at = entries.findIndex(([k]) => k === after) + 1;
    if (at === 0) throw new OpError(`"after" names the key ${JSON.stringify(after)}, which the parent does not hold`);
  }
  entries.splice(at, 0, [key, value]);
  for (const k of Object.keys(obj)) delete obj[k];
  for (const [k, v] of entries) put(obj, k, v);
}

// ---------------------------------------------------------------- the patch

const OP_FIELDS = {
  test: ['path', 'value', 'absent', 'sha256'],
  set: ['path', 'value', 'create', 'after'],
  delete: ['path', 'ifExists'],
  push: ['path', 'value', 'unique'],
  replaceInStrings: ['path', 'from', 'to', 'expectCount'],
};

// The ops of a patch object, checked for shape: every op known, every field
// known and of its type, every value one JSON can hold. Refuses (exit 2) on
// the first fault, naming the op by its 1-based number.
export function validateOps(ops) {
  if (!Array.isArray(ops) || ops.length === 0) throw refuse('the patch has no ops: "ops" must be a non-empty array');
  ops.forEach((op, i) => {
    const where = `op ${i + 1}`;
    if (!isObj(op)) throw refuse(`${where} is not an object`);
    // An own key only: OP_FIELDS["__proto__"] or ["constructor"] would find
    // Object's own machinery, and the field check below would then throw a
    // TypeError (exit 1) instead of refusing the patch (exit 2).
    const fields = typeof op.op === 'string' && Object.hasOwn(OP_FIELDS, op.op) ? OP_FIELDS[op.op] : null;
    if (!fields) throw refuse(`${where}: unknown op ${JSON.stringify(op.op)} (known: ${Object.keys(OP_FIELDS).join(', ')})`);
    for (const k of Object.keys(op)) {
      if (k !== 'op' && k !== 'irreversible' && !fields.includes(k)) throw refuse(`${where} (${op.op}): unknown field ${JSON.stringify(k)}`);
    }
    checkPath(op.path, where);
    if (Object.hasOwn(op, 'irreversible') && op.irreversible !== true) throw refuse(`${where}: "irreversible" can only be true`);
    const bool = (k) => {
      if (Object.hasOwn(op, k) && typeof op[k] !== 'boolean') throw refuse(`${where}: "${k}" must be true or false`);
    };
    const needValue = () => {
      if (!Object.hasOwn(op, 'value')) throw refuse(`${where} (${op.op}): "value" is required`);
      if (!isJsonValue(op.value)) throw refuse(`${where} (${op.op}): "value" is not a JSON value`);
    };
    switch (op.op) {
      case 'test': {
        const forms = ['value', 'absent', 'sha256'].filter((k) => Object.hasOwn(op, k));
        if (forms.length !== 1) throw refuse(`${where} (test): give exactly one of "value", "absent" or "sha256"`);
        if (forms[0] === 'value') needValue();
        if (forms[0] === 'absent' && op.absent !== true) throw refuse(`${where} (test): "absent" can only be true`);
        if (forms[0] === 'sha256' && !(typeof op.sha256 === 'string' && /^[0-9a-f]{64}$/.test(op.sha256))) throw refuse(`${where} (test): "sha256" must be 64 lowercase hex digits`);
        break;
      }
      case 'set':
        needValue();
        bool('create');
        if (Object.hasOwn(op, 'after') && op.after !== null && typeof op.after !== 'string') throw refuse(`${where} (set): "after" must be a sibling key or null`);
        if (op.path.length === 0 && !isObj(op.value)) throw refuse(`${where} (set): the root must stay a JSON object`);
        if (op.path.length === 0 && Object.hasOwn(op, 'after')) throw refuse(`${where} (set): "after" places a key; the root has no siblings`);
        break;
      case 'delete':
        bool('ifExists');
        if (op.path.length === 0) throw refuse(`${where} (delete): the root cannot be deleted`);
        break;
      case 'push':
        needValue();
        bool('unique');
        break;
      case 'replaceInStrings':
        if (typeof op.from !== 'string' || op.from === '') throw refuse(`${where} (replaceInStrings): "from" must be a non-empty string`);
        if (typeof op.to !== 'string') throw refuse(`${where} (replaceInStrings): "to" must be a string`);
        if (Object.hasOwn(op, 'expectCount') && !(Number.isSafeInteger(op.expectCount) && op.expectCount >= 0)) throw refuse(`${where} (replaceInStrings): "expectCount" must be a non-negative integer`);
        break;
      default:
        break;
    }
  });
  const irreversible = ops.filter((op) => op.irreversible);
  if (irreversible.length) {
    throw refuse(`the patch holds ${irreversible.length} irreversible op(s), whose old values were secret and never stored; nothing was applied: ${irreversible.map((op) => fmt(op.path)).join(', ')}`, { irreversible: irreversible.map((op) => op.path) });
  }
  return ops;
}

// Apply validated ops to `doc` in place, in order. Returns one change record
// per op: {op, path, note, old?, new?, count?, strings?, afterFlag?}, where
// old and new are the raw values (the caller masks them for output), and
// afterFlag says the item sat right after a secret flag (["--api-key", v])
// when the op ran, so the caller masks it too: the item alone is not
// secret-shaped. Throws OpError on the first op that cannot apply.
export function applyOps(doc, ops) {
  const changes = [];
  ops.forEach((op, i) => {
    try {
      changes.push(applyOne(doc, op));
    } catch (e) {
      if (e instanceof OpError) throw new OpError(`op ${i + 1} (${op.op} ${fmt(op.path)}): ${e.message}`);
      throw e;
    }
  });
  return changes;
}

function applyOne(doc, op) {
  const p = op.path;
  const rec = { op: op.op, path: p };
  switch (op.op) {
    case 'test': {
      const r = lookup(doc, p);
      if (op.absent) {
        if (r.found) throw new OpError(`test failed: the path exists (holds ${JSON.stringify(describe(r.value))})`);
        return { ...rec, note: 'passed: absent' };
      }
      if (!r.found) throw new OpError('test failed: the path does not exist');
      const same = Object.hasOwn(op, 'sha256') ? hashValue(r.value) === op.sha256 : deepEqual(r.value, op.value);
      if (!same) throw new OpError(`test failed: the value differs (it holds ${JSON.stringify(describe(r.value))})`);
      return { ...rec, note: 'passed' };
    }
    case 'set': {
      const value = cloneJson(op.value);
      if (p.length === 0) {
        const old = cloneJson(doc);
        for (const k of Object.keys(doc)) delete doc[k];
        for (const [k, v] of Object.entries(value)) put(doc, k, v);
        return { ...rec, note: deepEqual(old, value) ? 'unchanged' : 'replaced the whole document', old, new: value };
      }
      let cur = doc;
      let made = 0;
      for (let i = 0; i < p.length - 1; i++) {
        const seg = p[i];
        if (Array.isArray(cur)) {
          if (typeof seg !== 'number') throw new OpError(`segment ${i + 1} is a key, but ${fmt(p.slice(0, i))} holds an array`);
          if (seg >= cur.length) throw new OpError(`${fmt(p.slice(0, i + 1))} does not exist (create makes objects, never array slots)`);
        } else if (isObj(cur)) {
          if (typeof seg !== 'string') throw new OpError(`segment ${i + 1} is an index, but ${fmt(p.slice(0, i))} holds an object`);
          if (!Object.hasOwn(cur, seg)) {
            if (!op.create) throw new OpError(`the parent ${fmt(p.slice(0, i + 1))} does not exist (pass "create": true to make it)`);
            put(cur, seg, {});
            made++;
          }
        } else throw new OpError(`${fmt(p.slice(0, i))} holds a ${typeOf(cur)}, not an object or array`);
        cur = cur[seg];
      }
      const key = p[p.length - 1];
      if (Array.isArray(cur)) {
        if (typeof key !== 'number') throw new OpError(`the last segment is a key, but the parent holds an array`);
        if (key >= cur.length) throw new OpError(`index ${key} is past the end of ${fmt(p.slice(0, -1))} (length ${cur.length}); push appends`);
        if (Object.hasOwn(op, 'after')) throw new OpError('"after" places a key in an object, not an array element');
        const old = cur[key];
        cur[key] = value;
        return { ...rec, note: deepEqual(old, value) ? 'unchanged' : 'replaced', old, new: value, ...afterFlagMark(cur, key) };
      }
      if (!isObj(cur)) throw new OpError(`${fmt(p.slice(0, -1))} holds a ${typeOf(cur)}, not an object or array`);
      if (typeof key !== 'string') throw new OpError('the last segment is an index, but the parent holds an object');
      const existed = Object.hasOwn(cur, key);
      const old = existed ? cur[key] : undefined;
      if (Object.hasOwn(op, 'after')) {
        if (existed) throw new OpError('"after" places a new key, but this key already exists');
        insertAfter(cur, key, value, op.after);
      } else put(cur, key, value);
      const note = existed ? (deepEqual(old, value) ? 'unchanged' : 'replaced') : `created${made ? ` (with ${made} new parent object${made > 1 ? 's' : ''})` : ''}`;
      return { ...rec, note, old, new: value };
    }
    case 'delete': {
      const r = lookup(doc, p);
      if (!r.found) {
        if (op.ifExists) return { ...rec, note: 'absent: nothing to delete (ifExists)' };
        throw new OpError('the path does not exist (pass "ifExists": true to allow that)');
      }
      const mark = Array.isArray(r.parent) ? afterFlagMark(r.parent, r.key) : {};
      if (Array.isArray(r.parent)) r.parent.splice(r.key, 1);
      else delete r.parent[r.key];
      return { ...rec, note: 'deleted', old: r.value, ...mark };
    }
    case 'push': {
      const r = lookup(doc, p);
      if (!r.found) throw new OpError('the path does not exist');
      if (!Array.isArray(r.value)) throw new OpError(`the path holds a ${typeOf(r.value)}, not an array`);
      if (op.unique && r.value.some((x) => deepEqual(x, op.value))) return { ...rec, note: 'already present: no-op (unique)' };
      r.value.push(cloneJson(op.value));
      return { ...rec, note: `appended at index ${r.value.length - 1}`, new: op.value, ...afterFlagMark(r.value, r.value.length - 1) };
    }
    case 'replaceInStrings': {
      const r = lookup(doc, p);
      if (!r.found) throw new OpError('the path does not exist');
      let count = 0;
      const strings = [];
      // split/join, never String.replace: a replacement string's $& and $'
      // patterns would corrupt it silently.
      const visit = (v, at) => {
        if (typeof v === 'string') {
          const parts = v.split(op.from);
          if (parts.length === 1) return v;
          count += parts.length - 1;
          strings.push(at);
          return parts.join(op.to);
        }
        if (Array.isArray(v)) v.forEach((x, i) => { v[i] = visit(x, [...at, i]); });
        else if (isObj(v)) for (const k of Object.keys(v)) put(v, k, visit(v[k], [...at, k]));
        return v;
      };
      const out = visit(r.value, p);
      if (typeof r.value === 'string' && out !== r.value) {
        if (Array.isArray(r.parent)) r.parent[r.key] = out;
        else put(r.parent, r.key, out);
      }
      if (Object.hasOwn(op, 'expectCount') && count !== op.expectCount) {
        throw new OpError(`expectCount is ${op.expectCount}, but ${count} occurrence(s) were found in ${strings.length} string(s); nothing was applied`);
      }
      return { ...rec, note: `${count} replacement(s) in ${strings.length} string(s)`, count, strings };
    }
    default:
      throw new OpError(`unknown op ${op.op}`);
  }
}

// ---------------------------------------------------------------- inverse

// The ops that turn `after` back into `before`, plus the paths this write
// changed ({path, kind: added|removed|changed}) for the persist check.
// Objects are compared key by key; an array, a scalar or a type change is
// one value. Within an object the inverse deletes the keys the write added,
// recurses into the shared ones and re-inserts the removed ones in their old
// order, each with "after" its old predecessor, so the bytes come back
// exactly. If the write reordered shared keys (a delete then set of one key),
// the whole object is restored instead.
export function buildInverse(before, after) {
  const ops = [];
  // The same ops with real values in place of redacted ones, for the self
  // check only; never stored.
  const check = [];
  const changed = [];
  const testNew = (p, v) => {
    const op = sensitive(p, v) ? { op: 'test', path: p, sha256: hashValue(v) } : { op: 'test', path: p, value: cloneJson(v) };
    ops.push(op);
    check.push(op);
  };
  const restore = (p, v, extra = {}) => {
    const secret = secretShaped(p, v);
    ops.push({ op: 'set', path: p, value: secret ? { redacted: true, sha256: hashValue(v) } : cloneJson(v), ...extra, ...(secret ? { irreversible: true } : {}) });
    check.push({ op: 'set', path: p, value: cloneJson(v), ...extra });
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const walk = (o, n, p) => {
    if (same(o, n)) return;
    if (isObj(o) && isObj(n)) {
      const ok = Object.keys(o);
      const nk = Object.keys(n);
      const inOld = new Set(ok);
      const inNew = new Set(nk);
      const sharedOld = ok.filter((k) => inNew.has(k));
      const sharedNew = nk.filter((k) => inOld.has(k));
      if (sharedOld.some((k, i) => k !== sharedNew[i])) {
        testNew(p, n);
        restore(p, o);
        changed.push({ path: p, kind: 'changed' });
        return;
      }
      for (const k of nk) {
        if (inOld.has(k)) continue;
        testNew([...p, k], n[k]);
        const del = { op: 'delete', path: [...p, k] };
        ops.push(del);
        check.push(del);
        changed.push({ path: [...p, k], kind: 'added' });
      }
      for (const k of sharedOld) walk(o[k], n[k], [...p, k]);
      ok.forEach((k, i) => {
        if (inNew.has(k)) return;
        const t = { op: 'test', path: [...p, k], absent: true };
        ops.push(t);
        check.push(t);
        restore([...p, k], o[k], { after: i === 0 ? null : ok[i - 1] });
        changed.push({ path: [...p, k], kind: 'removed' });
      });
      return;
    }
    testNew(p, n);
    restore(p, o);
    changed.push({ path: p, kind: 'changed' });
  };
  walk(before, after, []);
  return { ops, check, changed };
}

// ---------------------------------------------------------------- reporting

// A value as output may show it: the value itself for settings, unless it is
// under env, secret-shaped, or `masked` (an item right after a secret flag);
// never for claude-json.
function shown(target, p, v, masked = false) {
  if (v === undefined) return undefined;
  if (target === 'claude-json' || masked || sensitive(p, v)) return describe(v);
  return v;
}

function changeRecord(target, c) {
  const out = { op: c.op, path: c.path, note: c.note };
  const masked = (v) => !!c.afterFlag && flagValue(v);
  if (Object.hasOwn(c, 'old') && c.old !== undefined) out.old = shown(target, c.path, c.old, masked(c.old));
  if (Object.hasOwn(c, 'new') && c.new !== undefined) out.new = shown(target, c.path, c.new, masked(c.new));
  if (c.strings) {
    out.count = c.count;
    out.strings = c.strings;
  }
  return out;
}

// Every string value and key in a document: {path, key: bool, text}.
function* stringsIn(v, p = []) {
  if (typeof v === 'string') yield { path: p, key: false, text: v };
  else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* stringsIn(v[i], [...p, i]);
  else if (isObj(v)) {
    for (const k of Object.keys(v)) {
      yield { path: [...p, k], key: true, text: k };
      yield* stringsIn(v[k], [...p, k]);
    }
  }
}

// Mojibake in a document's strings and keys, with paths. For claude-json the
// run itself is left out: it is part of a value.
function mojibakeIn(target, doc) {
  const out = [];
  for (const s of stringsIn(doc)) {
    for (const m of findMojibake(s.text)) {
      const loc = { path: s.path, in: s.key ? 'key' : 'value', index: m.index };
      if (target === 'settings' && !sensitive(s.path, s.text)) Object.assign(loc, { text: m.text, repaired: m.repaired });
      out.push(loc);
    }
  }
  return out;
}

function nonAsciiPaths(doc) {
  const out = [];
  for (const s of stringsIn(doc)) if (!isAscii(s.text)) out.push({ path: s.path, in: s.key ? 'key' : 'value' });
  return out;
}

// The path and kind (open, close, scalar) of each line JSON.stringify(v,
// null, 2) prints, in order: how --diff knows which lines sit inside env.
function linePaths(v) {
  const out = [];
  const walk = (x, p) => {
    const kids = Array.isArray(x) ? x.map((y, i) => [i, y]) : isObj(x) ? Object.entries(x) : null;
    if (!kids || kids.length === 0) {
      out.push({ path: p, kind: 'scalar' });
      return;
    }
    out.push({ path: p, kind: 'open' });
    for (const [k, y] of kids) walk(y, [...p, k]);
    out.push({ path: p, kind: 'close' });
  };
  walk(v, []);
  return out;
}

// A key as a label may print it: a key whose own text holds a secret (a URL
// with a password, a token used as a key) reads <secret-shaped key sha8>
// instead. A path label is its JSON, with such keys so replaced (which
// makes it no longer JSON, so the stand-in can't pass for a real key).
const keyText = (s) => (typeof s === 'string' && secretString(s) ? `<secret-shaped key ${hashValue(s).slice(0, 8)}>` : s);
const pathLabel = (p) => (p.some((s) => keyText(s) !== s) ? `[${p.map((s) => (keyText(s) !== s ? keyText(s) : JSON.stringify(s))).join(',')}]` : fmt(p));

// What a hidden line shows instead of its text, {label, path}, or null to
// show the line. A closing line holds only a bracket. An opening line
// ("<key>": {) holds its own key, so it hides when that key's text holds a
// secret. A value line hides inside env; when it is secret-shaped (a key on
// its path, the line's own key included, or its value, judged by the same
// secretShaped() as every other output, so --diff can never show what the
// changes list hides); or when it is an array item right after a secret
// flag (["--api-key", v]). `doc` is the document the line belongs to. A
// label never prints a key whose text holds a secret (keyText).
// (Round 1 judged a line by its value alone and so showed a line whose KEY
// held the secret; before that, a line-text test hid it but its label
// printed the key.)
function hidden(info, doc) {
  const p = info.path;
  const own = p[p.length - 1];
  if (info.kind === 'close') return null;
  if (info.kind === 'open') return typeof own === 'string' && secretString(own) ? { label: pathLabel(p), path: p } : null;
  const e = p.indexOf('env');
  if (e >= 0) {
    const q = p.slice(0, e + 2);
    return { label: q.map(keyText).join('.'), path: q };
  }
  if (secretShaped(p, lookupQuiet(doc, p).value) || afterSecretFlag(lookupQuiet(doc, p.slice(0, -1)).value, own)) return { label: pathLabel(p), path: p };
  return null;
}

// A unified line diff (3 lines of context) between two canonical settings
// texts. A line inside env, or a secret-shaped one (hidden(), above), never
// shows its text: a removed or added one reads "~ env.<KEY> changed" (or
// added, removed, or unchanged when only its trailing comma moved, judged
// on the values, not the text), a context one "~ env.<KEY>".
function unifiedDiff(oldText, newText, oldDoc, newDoc, name) {
  const lines = (t) => {
    const l = t.split('\n');
    if (l[l.length - 1] === '') l.pop();
    return l;
  };
  const a = lines(oldText);
  const b = lines(newText);
  const ap = linePaths(oldDoc);
  const bp = linePaths(newDoc);
  if (ap.length !== a.length || bp.length !== b.length) throw new Error('diff: the line map does not match the text');
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const A = a.slice(pre, a.length - suf);
  const B = b.slice(pre, b.length - suf);
  const dp = Array.from({ length: A.length + 1 }, () => new Uint32Array(B.length + 1));
  for (let i = A.length - 1; i >= 0; i--) {
    for (let j = B.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const script = [];
  for (let k = 0; k < pre; k++) script.push({ t: ' ', ai: k, bi: k });
  let i = 0;
  let j = 0;
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) {
      script.push({ t: ' ', ai: pre + i++, bi: pre + j++ });
    } else if (i < A.length && (j === B.length || dp[i + 1][j] >= dp[i][j + 1])) {
      script.push({ t: '-', ai: pre + i++ });
    } else script.push({ t: '+', bi: pre + j++ });
  }
  for (let k = 0; k < suf; k++) script.push({ t: ' ', ai: a.length - suf + k, bi: b.length - suf + k });
  const changedAt = script.map((s, k) => (s.t === ' ' ? -1 : k)).filter((k) => k >= 0);
  if (!changedAt.length) return '';
  const C = 3;
  const hunks = [];
  for (const k of changedAt) {
    const last = hunks[hunks.length - 1];
    if (last && k - last.end <= 2 * C) last.end = k;
    else hunks.push({ start: k, end: k });
  }
  const out = [`--- a/${name}`, `+++ b/${name}`];
  for (const h of hunks) {
    const from = Math.max(0, h.start - C);
    const to = Math.min(script.length - 1, h.end + C);
    const part = script.slice(from, to + 1);
    const aBefore = script.slice(0, from).filter((s) => s.t !== '+').length;
    const bBefore = script.slice(0, from).filter((s) => s.t !== '-').length;
    const aCount = part.filter((s) => s.t !== '+').length;
    const bCount = part.filter((s) => s.t !== '-').length;
    out.push(`@@ -${aCount ? aBefore + 1 : aBefore},${aCount} +${bCount ? bBefore + 1 : bBefore},${bCount} @@`);
    let prev = null;
    for (const s of part) {
      const line = s.t === '+' ? b[s.bi] : a[s.ai];
      const info = s.t === '+' ? bp[s.bi] : ap[s.ai];
      const h = hidden(info, s.t === '+' ? newDoc : oldDoc);
      let text = `${s.t}${line}`;
      if (h && s.t === ' ') text = `~ ${h.label}`;
      else if (h) {
        const was = lookupQuiet(oldDoc, h.path);
        const now = lookupQuiet(newDoc, h.path);
        const status = !was.found ? 'added' : !now.found ? 'removed' : deepEqual(was.value, now.value) ? 'unchanged' : 'changed';
        text = `~ ${h.label} ${status}`;
      }
      // A changed value's - and + lines read the same once hidden: one line.
      if (h && text === prev) continue;
      out.push(text);
      prev = text;
    }
  }
  return `${out.join('\n')}\n`;
}

// ---------------------------------------------------------------- files

const fold = (p) => (IS_WIN ? path.resolve(p).toLowerCase() : path.resolve(p));

// The file a target writes when --file is not given. CLAUDE_CONFIG_DIR, a
// custom OAuth URL or a legacy ~/.claude/.config.json each move the CLI's
// own files elsewhere (binary: Wor() and y_() pick
// `${CLAUDE_CONFIG_DIR||home}/.claude${suffix}.json`, preferring a non-empty
// <config dir>/.config.json), so then the default is refused, not guessed.
export function defaultFile(target) {
  const home = os.homedir();
  if (process.env.CLAUDE_CONFIG_DIR) throw refuse('CLAUDE_CONFIG_DIR is set, so the CLI reads its config from there: pass --file explicitly');
  if (target === 'settings') return path.join(home, '.claude', 'settings.json');
  if (process.env.CLAUDE_CODE_CUSTOM_OAUTH_URL) throw refuse('CLAUDE_CODE_CUSTOM_OAUTH_URL is set, so the CLI uses a .claude-custom-oauth.json: pass --file explicitly');
  if (fs.existsSync(path.join(home, '.claude', '.config.json'))) throw refuse('~/.claude/.config.json exists, which the CLI may use in place of ~/.claude.json: pass --file explicitly');
  return path.join(home, '.claude.json');
}

// The CLI's own config is never a settings file. Written with --target
// settings it would skip the CLI's lock (<file>.lock, below) and print its
// values, so a settings target is refused when it IS one of the files the
// CLI may keep its config in (the same file, by real path or by device and
// inode, so a link or another spelling counts), or is named like one
// (.claude.json, .claude-<suffix>.json): the CLI may run with a
// CLAUDE_CONFIG_DIR this process never sees.
const CLI_CONFIG_NAME = /^\.claude(?:-[^\\/]+)?\.json$/i;

function cliConfigFiles() {
  const home = os.homedir();
  const homes = [home, process.env.CLAUDE_CONFIG_DIR].filter(Boolean);
  const configDirs = [path.join(home, '.claude'), process.env.CLAUDE_CONFIG_DIR].filter(Boolean);
  return [
    ...homes.flatMap((d) => [path.join(d, '.claude.json'), path.join(d, '.claude-custom-oauth.json')]),
    ...configDirs.map((d) => path.join(d, '.config.json')),
  ];
}

// The real path of a file, or of its folder plus its name when the file
// does not exist yet (--create).
function realish(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    try {
      return path.join(fs.realpathSync(path.dirname(p)), path.basename(p));
    } catch {
      return path.resolve(p);
    }
  }
}

function sameFile(a, b) {
  if (fold(realish(a)) === fold(realish(b))) return true;
  try {
    const x = fs.statSync(a, { bigint: true });
    const y = fs.statSync(b, { bigint: true });
    // A file system that reports no inode (0) proves nothing.
    return x.ino !== 0n && x.dev === y.dev && x.ino === y.ino;
  } catch {
    return false;
  }
}

function refuseCliConfig(file) {
  if (CLI_CONFIG_NAME.test(path.basename(file)) || cliConfigFiles().some((c) => sameFile(file, c))) {
    throw refuse(`${file} is the Claude Code CLI's own config file, not a settings file: --target claude-json writes it, under the CLI's lock and without printing its values`);
  }
}

// The mirror: a settings file is never the CLI's config. Written with
// --target claude-json it would skip the ASCII rule (KTD 14) and the
// settings encoding check, take the CLI's lock dir (<file>.lock) instead of
// the .sw.lock every settings writer takes, so a settings write could run
// at the same time, and leave that lock dir's name beside it. So a
// claude-json target is refused when it is named settings*.json
// (settings.json, settings.local.json, in any folder) or is the same file
// as ~/.claude/settings.json or settings.local.json (by real path or by
// device and inode, as above; CLAUDE_CONFIG_DIR's too). Checked before the
// lock, so nothing is made beside it.
const SETTINGS_NAME = /^settings[^\\/]*\.json$/i;

function settingsFiles() {
  const dirs = [path.join(os.homedir(), '.claude'), process.env.CLAUDE_CONFIG_DIR].filter(Boolean);
  return dirs.flatMap((d) => [path.join(d, 'settings.json'), path.join(d, 'settings.local.json')]);
}

function refuseSettingsFile(file) {
  if (SETTINGS_NAME.test(path.basename(file)) || settingsFiles().some((s) => sameFile(file, s))) {
    throw refuse(`${file} is a settings file, not the CLI's config: --target settings writes it, under its own lock and the ASCII rule`);
  }
}

export function defaultInverseOut(target, now = new Date()) {
  return path.join(os.homedir(), '.claude', 'flow', 'settings-writer', `${now.toISOString().replace(/[:.]/g, '-')}-${target}-inverse.json`);
}

function readOrNull(file) {
  try {
    return fs.readFileSync(file);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

const shaOf = (bytes) => (bytes === null ? null : sha256(bytes));

// Write a new file whole (exclusive create, fsync). Throws EEXIST if taken.
// A write that fails after the create (a full disk) removes the part file:
// the name was free, so what is there is ours.
function writeNew(file, data, mode = 0o600) {
  const fd = fs.openSync(file, 'wx', mode);
  let ok = false;
  try {
    fs.writeFileSync(fd, data);
    fs.fsyncSync(fd);
    ok = true;
  } finally {
    fs.closeSync(fd);
    if (!ok) unlinkQuiet(file);
  }
}

function unlinkQuiet(file) {
  try {
    fs.unlinkSync(file);
  } catch { /* already gone */ }
}

// ---------------------------------------------------------------- locks

// Our own lock for a settings file: <file>.sw.lock holding the owner's token.
// A lock older than 60 s is a crashed owner's (the critical section takes
// milliseconds); it is renamed aside and checked, so two waiters can't both
// break it and one delete the other's fresh lock (probes/run.mjs withLock).
async function withOwnLock(file, waitMs, fn) {
  const lock = `${file}.sw.lock`;
  const token = `${process.pid}.${randomBytes(8).toString('hex')}`;
  const t0 = Date.now();
  let delay = 20;
  for (;;) {
    try {
      writeNew(lock, token, 0o644);
      break;
    } catch (e) {
      // EPERM/EACCES: Windows while a deleted lock is still pending.
      if (!['EEXIST', 'EPERM', 'EACCES'].includes(e.code)) throw e;
      breakIfStale(lock);
      if (Date.now() - t0 >= waitMs) throw new Stop(EXIT.LOCK, `${lock} is held by another writer (waited ${span(waitMs)}; last ${e.code})`);
      await sleep(delay);
      delay = Math.min(delay * 2, 400);
    }
  }
  try {
    return await fn();
  } finally {
    try {
      if (fs.readFileSync(lock, 'utf8') === token) fs.rmSync(lock, { force: true });
    } catch { /* gone: broken as stale */ }
  }
}

function breakIfStale(lock) {
  let seen;
  let st;
  try {
    seen = fs.readFileSync(lock, 'utf8');
    st = fs.statSync(lock);
  } catch {
    return;
  }
  if (Date.now() - st.mtimeMs <= SETTINGS_LOCK_STALE_MS) return;
  const aside = `${lock}.${process.pid}.${randomBytes(4).toString('hex')}.stale`;
  try {
    fs.renameSync(lock, aside);
  } catch {
    return;
  }
  let moved = null;
  try {
    moved = fs.readFileSync(aside, 'utf8');
  } catch { /* unreadable: treat as not the one judged stale */ }
  if (moved !== seen) {
    // A fresh lock taken after our look: hand it back if its slot is free.
    try { fs.linkSync(aside, lock); } catch { /* the slot is taken again */ }
  }
  fs.rmSync(aside, { force: true });
}

// The CLI's own lock for ~/.claude.json: the directory <file>.lock, made
// with mkdir (see the header for the binary evidence). Never broken, never
// refreshed; removed only if it is still the directory we made.
async function withCliLock(file, waitMs, fn, warnings) {
  const lock = `${file}.lock`;
  const t0 = Date.now();
  let delay = 25;
  for (;;) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch (e) {
      if (!['EEXIST', 'EPERM', 'EACCES'].includes(e.code)) throw e;
      let st = null;
      try {
        st = fs.statSync(lock);
      } catch { /* released between the mkdir and the stat: try again */ }
      if (st && Date.now() - st.mtimeMs > CLI_LOCK_STALE_MS) {
        throw new Stop(EXIT.LOCK, `${lock} is stale (last touched ${Math.round((Date.now() - st.mtimeMs) / 1000)} s ago; a live CLI refreshes it every 5 s). Its owner died; this writer never removes a lock it did not make. The CLI breaks it on its next config write (it treats 10 s as stale).`);
      }
      if (Date.now() - t0 >= waitMs) throw new Stop(EXIT.LOCK, `${lock} is held (waited ${span(waitMs)}): another Claude Code process is writing ~/.claude.json`);
      await sleep(delay);
      delay = Math.min(delay * 2, 500);
    }
  }
  const mine = fs.statSync(lock, { bigint: true });
  const t1 = Date.now();
  try {
    return await fn();
  } finally {
    const held = Date.now() - t1;
    if (held > 5_000) warnings.push(`held ${lock} for ${held} ms; the CLI breaks a lock it sees untouched for 10 s`);
    let now = null;
    try {
      now = fs.statSync(lock, { bigint: true });
    } catch { /* gone */ }
    // Ours only if nothing about it changed: a file system may hand a new
    // dir the old one's inode (ext4) or birth time (NTFS tunneling), never
    // both and the same modify and change times as well.
    const same = (k) => now[k] === mine[k];
    if (now && ['ino', 'birthtimeNs', 'mtimeNs', 'ctimeNs'].every(same)) {
      for (let i = 0; ; i++) {
        try {
          fs.rmdirSync(lock);
          break;
        } catch (e) {
          if (e.code === 'ENOENT') break;
          if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code) || i >= 20) {
            warnings.push(`could not remove ${lock} (${e.code}); the CLI will treat it as stale after 10 s`);
            break;
          }
          await sleep(50);
        }
      }
    } else warnings.push(`${lock} was no longer the one this writer made; left in place`);
  }
}

// ---------------------------------------------------------------- the writer

function resolveOptions(o) {
  if (!TARGETS.includes(o.target)) throw refuse(`--target must be one of ${TARGETS.join(', ')}`);
  const modes = [o.ops !== undefined || o.patch !== undefined, !!o.reformat, o.applyInverse !== undefined].filter(Boolean).length;
  if (modes !== 1) throw refuse('give exactly one of a patch (--patch), --reformat or --apply-inverse');
  if (o.ops !== undefined && o.patch !== undefined) throw refuse('give ops or patch, not both');
  if (o.create && o.target !== 'settings') throw refuse('--create is for a settings file only; ~/.claude.json is never created here');
  if (o.diff && o.target !== 'settings') throw refuse('--diff is for settings only: a diff of ~/.claude.json would print its values');
  // A reformat's old text is not canonical, so no line map could say which
  // of its lines sit inside env: a diff could print an env value.
  if (o.diff && o.reformat) throw refuse('--diff does not combine with --reformat (it could not hide env lines of non-canonical text)');
  if (o.expectSha !== undefined && !(typeof o.expectSha === 'string' && /^[0-9a-fA-F]{64}$/.test(o.expectSha))) throw refuse('--expect-sha must be a sha256 (64 hex digits)');
  for (const k of ['lockWaitMs', 'persistDelayMs']) {
    if (o[k] !== undefined && !(Number.isSafeInteger(o[k]) && o[k] >= 0)) throw refuse(`${k} must be a non-negative integer`);
  }
  const file = path.resolve(o.file ?? defaultFile(o.target));
  if (o.target === 'settings') refuseCliConfig(file);
  else refuseSettingsFile(file);
  let ops = null;
  if (o.patch !== undefined) {
    if (!isObj(o.patch)) throw refuse('the patch must be a JSON object: {"ops": [...]}');
    for (const k of Object.keys(o.patch)) {
      if (k === 'inverseOf') throw refuse('this patch is an inverse file: use --apply-inverse, which checks it belongs to this file');
      if (k !== 'ops') throw refuse(`the patch has an unknown field ${JSON.stringify(k)} (only "ops")`);
    }
    ops = validateOps(o.patch.ops);
  } else if (o.ops !== undefined) ops = validateOps(o.ops);
  else if (o.applyInverse !== undefined) {
    let inv;
    try {
      inv = JSON.parse(fs.readFileSync(o.applyInverse, 'utf8'));
    } catch (e) {
      throw refuse(`cannot read the inverse file ${o.applyInverse}: ${e.code || 'not valid JSON'}`);
    }
    if (!isObj(inv) || !isObj(inv.inverseOf)) throw refuse(`${o.applyInverse} is not an inverse file (no "inverseOf")`);
    for (const k of Object.keys(inv)) if (k !== 'ops' && k !== 'inverseOf') throw refuse(`the inverse file has an unknown field ${JSON.stringify(k)}`);
    if (inv.inverseOf.target !== o.target) throw refuse(`the inverse file undoes a ${inv.inverseOf.target} write, not ${o.target}`);
    if (typeof inv.inverseOf.file !== 'string' || fold(inv.inverseOf.file) !== fold(file)) throw refuse(`the inverse file undoes a write to ${inv.inverseOf.file}, not ${file}`);
    ops = validateOps(inv.ops);
  }
  let inverseOut = null;
  if (o.inverseOut !== undefined && o.inverseOut !== null) {
    inverseOut = path.resolve(o.inverseOut);
    if (fs.existsSync(inverseOut)) throw refuse(`the inverse file ${inverseOut} already exists; an inverse is never overwritten`);
  }
  return {
    target: o.target,
    file,
    ops,
    reformat: !!o.reformat,
    expectSha: o.expectSha?.toLowerCase(),
    dryRun: !!o.dryRun,
    diff: !!o.diff,
    create: !!o.create,
    persistCheck: o.target === 'claude-json' || !!o.persistCheck,
    inverseOut,
    lockWaitMs: o.lockWaitMs ?? 10_000,
    persistDelayMs: o.persistDelayMs ?? 1_500,
    seams: o.seams ?? {},
  };
}

// The JSON.parse failure's position only: V8 quotes a slice of the text in
// some messages, and for ~/.claude.json that slice is a value.
function parseError(e) {
  const m = /position \d+(?: \(line \d+ column \d+\))?/.exec(String(e?.message));
  return m ? `not valid JSON (at ${m[0]})` : 'not valid JSON';
}

export async function settingsWrite(options = {}) {
  const res = { ok: false, exit: EXIT.INTERNAL, target: options.target ?? null, file: null, before: null, after: null, written: false, noop: false, dryRun: !!options.dryRun, changes: [], warnings: [], inverse: null };
  let plan;
  try {
    plan = resolveOptions(options);
    res.file = plan.file;
    const lock = plan.target === 'claude-json' ? (fn) => withCliLock(plan.file, plan.lockWaitMs, fn, res.warnings) : (fn) => withOwnLock(plan.file, plan.lockWaitMs, fn);
    const done = await lock(() => writeLocked(plan, res));
    if (done && plan.persistCheck) await persistCheck(plan, res, done);
    res.ok = true;
    res.exit = EXIT.OK;
  } catch (e) {
    res.ok = false;
    if (e instanceof Stop) {
      res.exit = e.exit;
      res.error = e.message;
      Object.assign(res, e.extra);
    } else {
      res.exit = EXIT.INTERNAL;
      res.error = `internal error: ${e?.code ? `${e.code} ` : ''}${e?.message ?? e}`;
    }
  }
  return res;
}

// Steps 2-12 under the lock. Returns what the persist check needs, or null
// when nothing was written (no change, dry run).
async function writeLocked(plan, res) {
  const { target, file } = plan;
  const bytes = readOrNull(file);
  if (bytes === null && !(target === 'settings' && plan.create)) {
    throw refuse(`${file} does not exist${target === 'settings' ? ' (--create starts a new settings file as {})' : ''}`);
  }
  const before = shaOf(bytes);
  res.before = before;
  // Exit 3, not 2: the caller planned from another version of the file, so
  // "read it again and re-plan" is the answer, as for step 10's check. A
  // caller then needs no sha compare of its own to tell this from a refusal.
  if (plan.expectSha && plan.expectSha !== before) throw new Stop(EXIT.CONCURRENT, `--expect-sha does not match: the file is ${before ?? 'missing'}, not the version the caller read; nothing was written. Read it again and re-plan.`);

  let text = null;
  let doc = {};
  let newline = true;
  if (bytes !== null) {
    // A BOM is refused but for --reformat, which drops it (the canonical
    // form has none, and nothing else could ever fix such a file). Invalid
    // UTF-8 is refused always: no op can name what the bytes meant.
    const enc = scanEncoding(bytes);
    const locations = [];
    const problems = [];
    if (enc.bom && !plan.reformat) {
      locations.push({ offset: 0, problem: 'BOM' });
      problems.push('it starts with a UTF-8 BOM (--reformat alone removes it)');
    }
    if (enc.counts.invalidUtf8) {
      for (const x of enc.invalidUtf8) locations.push({ offset: x.offset, problem: 'invalid UTF-8' });
      problems.push(`${enc.counts.invalidUtf8} byte(s) are not valid UTF-8 (first at offset ${enc.invalidUtf8[0].offset})`);
    }
    if (problems.length) throw refuse(`${file} is damaged: ${problems.join('; ')}`, { locations });
    text = bytes.subarray(enc.bom ? 3 : 0).toString('utf8');
    try {
      doc = JSON.parse(text);
    } catch (e) {
      throw refuse(`${file} is ${parseError(e)}`);
    }
    if (!isObj(doc)) throw refuse(`${file} does not hold a JSON object at the top`);
    newline = text.endsWith('\n');
    const canon = canonicalText(doc, newline);
    if (!plan.reformat && text !== canon) {
      const a = text.split('\n');
      const b = canon.split('\n');
      let line = 0;
      while (line < a.length && a[line] === b[line]) line++;
      throw refuse(`${file} is not in canonical form (JSON.stringify with 2-space indent${newline ? ', one trailing newline' : ''}); the first difference is on line ${line + 1}. Run --reformat alone first, then the patch.`, { locations: [{ line: line + 1, problem: 'not canonical' }] });
    }
  }
  const inputMojibake = mojibakeIn(target, doc);

  // 4-5. Apply the ops to a fresh parse (never to `doc`, which the inverse
  // and the diff compare against) and serialize.
  const work = text === null ? {} : JSON.parse(text);
  if (plan.ops) {
    try {
      res.changes = applyOps(work, plan.ops).map((c) => changeRecord(target, c));
    } catch (e) {
      if (e instanceof OpError) throw refuse(`${e.message}; nothing was written`);
      throw e;
    }
  }
  const outText = canonicalText(work, newline);
  const out = Buffer.from(outText, 'utf8');

  // Mojibake. A patch must repair every run it finds and add none. A
  // reformat changes bytes, not values, so it keeps the runs that were
  // there, named in a warning (as non-ASCII is, below): else a file with a
  // BOM or a non-canonical layout AND mojibake could never be fixed, since
  // a patch needs canonical input and the repair is a patch. It may never
  // write more runs than it read.
  const outputMojibake = mojibakeIn(target, work);
  if (plan.reformat) {
    if (outputMojibake.length > inputMojibake.length) throw refuse(`the reformat would write ${outputMojibake.length} mojibake run(s) where the file holds ${inputMojibake.length}`, { locations: outputMojibake });
    if (outputMojibake.length) res.warnings.push(`kept ${outputMojibake.length} mojibake run(s) at ${outputMojibake.map((m) => `${fmt(m.path)}${m.in === 'key' ? ' (key)' : ''}`).join(', ')}; repair them with replaceInStrings next (a run in a key needs delete and set)`);
  } else if (outputMojibake.length) {
    throw refuse(inputMojibake.length
      ? `${file} holds mojibake (text decoded as Windows-1252 and re-encoded): ${outputMojibake.length} run(s) the patch does not repair. Repair is explicit: a replaceInStrings op per run (a run in a key needs delete and set).`
      : `the patch would write ${outputMojibake.length} mojibake run(s)`, { locations: outputMojibake });
  } else if (inputMojibake.length) res.warnings.push(`the patch repaired ${inputMojibake.length} mojibake run(s)`);

  // 6. settings text stays ASCII. A reformat adds no text, so it may keep
  // what is already there (else a non-canonical file holding non-ASCII
  // could never be fixed: a patch needs canonical input, a reformat ASCII
  // output); it is named in a warning instead.
  if (target === 'settings' && !isAscii(outText)) {
    const where = nonAsciiPaths(work);
    if (!plan.reformat) {
      throw refuse(`settings text must be pure ASCII (KTD 14) and the output would hold non-ASCII at ${where.length} place(s): ${where.map((w) => `${fmt(w.path)}${w.in === 'key' ? ' (key)' : ''}`).join(', ')}. Fold them with replaceInStrings (an em dash to "--").`, { locations: where });
    }
    res.warnings.push(`kept non-ASCII at ${where.length} place(s): ${where.map((w) => fmt(w.path)).join(', ')}; fold them with replaceInStrings next`);
  }

  if (plan.diff) res.diff = unifiedDiff(text ?? canonicalText({}, true), outText, doc, work, path.basename(file));

  // 7. No change.
  if (bytes !== null && out.equals(bytes)) {
    res.noop = true;
    res.after = before;
    res.warnings.push('no change: nothing written');
    return null;
  }
  // `after` is reported only for what was (or, on a dry run, would be)
  // written: never for a write that stopped short.
  const afterSha = sha256(out);

  // The inverse, checked before anything is written: applied to the new
  // document it must give back the original bytes.
  const inverse = plan.reformat ? null : buildInverse(doc, work);
  if (inverse) {
    const back = JSON.parse(outText);
    applyOps(back, inverse.check);
    if (canonicalText(back, newline) !== canonicalText(doc, newline)) throw new Error('the inverse ops do not restore the original document; nothing was written');
    if (bytes === null) res.warnings.push('the file did not exist before: its inverse restores {}, not a missing file');
    if (target === 'settings' && !isAscii(canonicalText(doc, newline))) res.warnings.push('the inverse puts non-ASCII text back, which the ASCII rule refuses: --apply-inverse on it will be refused');
    if (inputMojibake.length) res.warnings.push('the inverse puts the mojibake back, which is refused: --apply-inverse on it will be refused');
    const irreversible = inverse.ops.filter((op) => op.irreversible).length;
    if (irreversible) res.warnings.push(`${irreversible} inverse op(s) are irreversible: their old values are secret-shaped and were not stored`);
  } else res.warnings.push('a reformat changes bytes, not values: no inverse ops, no inverse file');

  // 8. Dry run.
  if (plan.dryRun) {
    res.after = afterSha;
    return null;
  }

  let inverseFile = null;
  if (inverse) {
    const body = `${JSON.stringify({ inverseOf: { target, file, before, after: afterSha, at: new Date().toISOString() }, ops: inverse.ops }, null, 2)}\n`;
    if (plan.inverseOut) {
      fs.mkdirSync(path.dirname(plan.inverseOut), { recursive: true });
      writeNew(plan.inverseOut, body);
      inverseFile = plan.inverseOut;
    } else {
      const base = defaultInverseOut(target);
      fs.mkdirSync(path.dirname(base), { recursive: true });
      for (let n = 1; ; n++) {
        const f = n === 1 ? base : base.replace(/-inverse\.json$/, `-inverse-${n}.json`);
        try {
          writeNew(f, body);
          inverseFile = f;
          break;
        } catch (e) {
          if (e.code !== 'EEXIST' || n >= 100) throw e;
        }
      }
    }
  }

  // 9-11. Temp file, the concurrent-change check, the rename.
  const tmp = path.join(path.dirname(file), `${path.basename(file)}.sw-${process.pid}-${randomBytes(4).toString('hex')}.tmp`);
  let renamed = false;
  try {
    writeNew(tmp, out);
    if (!IS_WIN) {
      // Keep the target's mode: the CLI writes ~/.claude.json 0600.
      try {
        if (bytes !== null) fs.chmodSync(tmp, fs.statSync(file).mode & 0o777);
      } catch { /* the check below sees a vanished target */ }
    }
    if (plan.seams.beforeRename) await plan.seams.beforeRename(file);
    if (shaOf(readOrNull(file)) !== before) {
      throw new Stop(EXIT.CONCURRENT, `${file} changed while this write was being prepared (another writer); nothing was written`);
    }
    // The window no check can close for a rename (a writer landing between
    // the check above and the rename is overwritten; step 12 and the
    // persist check report what follows). A new file has no such window.
    if (plan.seams.afterCheck) await plan.seams.afterCheck(file);
    if (bytes === null) {
      // A new file: a hard link fails if someone created it meanwhile,
      // where a rename would clobber theirs.
      try {
        fs.linkSync(tmp, file);
      } catch (e) {
        if (e.code === 'EEXIST') throw new Stop(EXIT.CONCURRENT, `${file} was created by another writer meanwhile; nothing was written`);
        throw e;
      }
      unlinkQuiet(tmp);
    } else {
      const t0 = Date.now();
      for (let delay = 25; ; delay = Math.min(delay * 2, 400)) {
        try {
          fs.renameSync(tmp, file);
          break;
        } catch (e) {
          if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code) || Date.now() - t0 >= RENAME_RETRY_MS) throw e;
          await sleep(delay);
        }
      }
    }
    renamed = true;
  } finally {
    if (!renamed) {
      unlinkQuiet(tmp);
      if (inverseFile) unlinkQuiet(inverseFile);
    }
  }
  res.written = true;
  res.after = afterSha;
  res.inverse = inverseFile;
  if (!IS_WIN) {
    try {
      const fd = fs.openSync(path.dirname(file), 'r');
      try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    } catch { /* best effort: the rename is already visible */ }
  }
  if (plan.seams.afterRename) await plan.seams.afterRename(file);

  // 12. Re-read.
  const again = readOrNull(file);
  if (again === null || !again.equals(out)) {
    throw new Stop(EXIT.POSTCHECK, `written, but the re-read differs from what was written (another writer raced in after the rename)`);
  }
  if (target === 'settings') {
    // A reformat may keep the mojibake and non-ASCII it read (step 5 and 6),
    // never more mojibake than that.
    const enc = scanEncoding(again);
    const keptMojibake = plan.reformat ? inputMojibake.length : 0;
    if (enc.counts.mojibake > keptMojibake || enc.counts.invalidUtf8 || enc.bom || (!plan.reformat && enc.counts.nonAscii)) throw new Stop(EXIT.POSTCHECK, 'written, but the re-read fails the encoding check');
  }
  return { work, changed: inverse ? inverse.changed : [] };
}

// Step 14: a later re-read must still show every changed path with its new
// value. Paths only in the message, never values.
async function persistCheck(plan, res, { work, changed }) {
  if (plan.seams.beforePersistCheck) await plan.seams.beforePersistCheck(plan.file);
  await sleep(plan.persistDelayMs);
  const bytes = readOrNull(plan.file);
  let doc = null;
  try {
    doc = bytes === null ? null : JSON.parse(bytes.toString('utf8'));
  } catch { /* reported below */ }
  if (!isObj(doc)) throw new Stop(EXIT.POSTCHECK, `clobbered by another writer: ${plan.file} ${bytes === null ? 'is gone' : 'no longer parses'} ${plan.persistDelayMs} ms after the write`);
  const lost = [];
  for (const c of changed) {
    const r = lookupQuiet(doc, c.path);
    const want = lookupQuiet(work, c.path);
    const ok = c.kind === 'removed' ? !r.found : r.found && want.found && deepEqual(r.value, want.value);
    if (!ok) lost.push(c.path);
  }
  if (lost.length) throw new Stop(EXIT.POSTCHECK, `clobbered by another writer: ${lost.length} changed path(s) no longer hold this write's value ${plan.persistDelayMs} ms later: ${lost.map(fmt).join(', ')}`, { clobbered: lost });
  res.persisted = true;
}

function lookupQuiet(doc, p) {
  try {
    return lookup(doc, p);
  } catch {
    return { found: false };
  }
}

// ---------------------------------------------------------------- the CLI

const USAGE = `usage: node settings-write.mjs --target settings|claude-json
         (--patch <file> | --reformat | --apply-inverse <file>)
         [--file <path>] [--expect-sha <sha256>] [--dry-run] [--diff]
         [--inverse-out <file>] [--create] [--persist-check]
         [--lock-wait-ms <n>] [--persist-delay-ms <n>]
See the header of this file for the patch format and the exit codes.`;

export function parseArgs(argv) {
  const o = {};
  const flags = { '--dry-run': 'dryRun', '--diff': 'diff', '--create': 'create', '--persist-check': 'persistCheck', '--reformat': 'reformat', '--help': 'help' };
  const values = { '--target': 'target', '--file': 'file', '--patch': 'patchFile', '--apply-inverse': 'applyInverse', '--expect-sha': 'expectSha', '--inverse-out': 'inverseOut', '--lock-wait-ms': 'lockWaitMs', '--persist-delay-ms': 'persistDelayMs' };
  // Own keys only, as in validateOps: an argument "constructor" or
  // "__proto__" must be unknown, not a lookup into Object's machinery.
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (Object.hasOwn(flags, k)) o[flags[k]] = true;
    else if (Object.hasOwn(values, k)) {
      if (i + 1 >= argv.length) throw refuse(`${k} needs a value`);
      if (Object.hasOwn(o, values[k])) throw refuse(`${k} given twice`);
      o[values[k]] = argv[++i];
    } else throw refuse(`unknown argument ${k}`);
  }
  for (const k of ['lockWaitMs', 'persistDelayMs']) {
    if (o[k] !== undefined) {
      if (!/^\d+$/.test(o[k])) throw refuse(`${k === 'lockWaitMs' ? '--lock-wait-ms' : '--persist-delay-ms'} must be a whole number of milliseconds`);
      o[k] = Number(o[k]);
    }
  }
  return o;
}

export async function main(argv) {
  let res;
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    res = { ok: false, exit: EXIT.REFUSED, error: e.message };
  }
  if (o?.help) {
    process.stdout.write(`${USAGE}\n`);
    return EXIT.OK;
  }
  if (!res && o.patchFile !== undefined) {
    try {
      o.patch = JSON.parse(fs.readFileSync(o.patchFile, 'utf8'));
    } catch (e) {
      res = { ok: false, exit: EXIT.REFUSED, target: o.target ?? null, error: `cannot read the patch file ${o.patchFile}: ${e.code || 'not valid JSON'}` };
    }
    delete o.patchFile;
  }
  if (!res) res = await settingsWrite(o);
  process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
  if (!res.ok) process.stderr.write(`settings-write: exit ${res.exit}: ${res.error}\n`);
  return res.exit;
}

// The CLI runs only when this file is the script node was started with:
// process.argv[1] names it. Both sides go through one realpath (node gives
// argv[1] resolved but not real, and import.meta.url real), so a link, a
// relative path or a letter-case spelling of the path compares equal. False
// when deploy.mjs or a test imports the file (argv[1] is theirs). Not
// import.meta.main: Node before 24.2 leaves it undefined, and there the CLI
// would exit 0 having done nothing.
function invokedAsCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fs.realpathSync(entry) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedAsCli()) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }, (e) => {
    process.stderr.write(`settings-write: exit 1: ${e?.stack || e}\n`);
    process.exitCode = EXIT.INTERNAL;
  });
}
