#!/usr/bin/env node
// capture.mjs: the probe hook. A probe's settings point every hook it needs at
// this script, with a label:
//
//   node capture.mjs <label> [--respond <file>] [--exit <n>] [--stderr <file>]
//                    [--when-inactive] [--first-only]
//
// Each firing appends one JSON line to $PROBE_OUT/captures.jsonl:
//   {label, at, pid, ppid, env, input}
// where `input` is the hook's stdin parsed as JSON (or {_raw} when it isn't),
// and `env` is the CLAUDE*, ENTRYPOINT* and ATTENDED* variables the hook
// process sees, with any token, key, secret or socket value replaced by
// "<present>". Then it answers as the probe asks: --respond prints a file's
// bytes to stdout, --stderr prints a file's bytes to stderr, --exit sets the
// exit code (default 0). --when-inactive answers only while the input's
// stop_hook_active isn't true, so a Stop hook that keeps the turn going does
// it once, not until the continuation cap. --first-only answers only on the
// label's first firing in the whole session.
//
// Without PROBE_OUT it writes nothing and exits 0: a stray copy of a probe
// setting must never fail a real session's hook.

import fs from 'node:fs';
import path from 'node:path';

const REDACT = /TOKEN|KEY|SECRET|PASSWORD|SOCKET|AUTH|CREDENTIAL/i;

function envSlice(env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    if (!/^(CLAUDE|ENTRYPOINT|ATTENDED)/.test(k)) continue;
    out[k] = REDACT.test(k) ? '<present>' : v;
  }
  return out;
}

function parseArgs(argv) {
  const a = { label: argv[0] || 'unlabeled', exit: 0 };
  for (let i = 1; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--respond') { a.respond = v; i++; }
    else if (k === '--stderr') { a.stderr = v; i++; }
    else if (k === '--exit') { a.exit = Number(v); i++; }
    else if (k === '--when-inactive') a.whenInactive = true;
    else if (k === '--first-only') a.firstOnly = true;
  }
  return a;
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

const args = parseArgs(process.argv.slice(2));
const raw = readStdin();
const out = process.env.PROBE_OUT;
if (out) {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    input = { _raw: raw };
  }
  const line = { label: args.label, at: new Date().toISOString(), pid: process.pid, ppid: process.ppid, env: envSlice(process.env), input };
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, 'captures.jsonl');
  fs.appendFileSync(file, `${JSON.stringify(line)}\n`);
  // --first-only counts the lines before this firing's own whose parsed label
  // is this one: a payload that merely contains the label's text never
  // counts, and two firings racing each other agree on which came first,
  // because each counts only what was appended ahead of it.
  let earlier = 0;
  if (args.firstOnly) {
    for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
      let c;
      try { c = JSON.parse(l); } catch { continue; } // blank, or another firing's line mid-write
      if (c.pid === line.pid && c.at === line.at && c.label === line.label) break;
      if (c.label === args.label) earlier++;
    }
  }
  if (!(args.whenInactive && input?.stop_hook_active === true) && earlier === 0) {
    if (args.respond) process.stdout.write(fs.readFileSync(args.respond));
    if (args.stderr) process.stderr.write(fs.readFileSync(args.stderr));
    process.exitCode = args.exit;
  }
}
