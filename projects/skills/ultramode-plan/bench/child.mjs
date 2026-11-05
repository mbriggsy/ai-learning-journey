// Runs one child built by launch.mjs and returns what it printed (U1; U7's run-arm reuses it).
// The bench session's main loop starts every child, never a helper (KTD16).

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

// Resolves when the child exits or the deadline kills it; never rejects on a child failure,
// so the caller records every outcome. stdout is the -p result JSON when the child finished.
export function runChild(launch, { timeoutMs = 30 * 60_000, stdoutFile, stderrFile } = {}) {
  return new Promise((resolveRun) => {
    const started = new Date().toISOString();
    const t0 = process.hrtime.bigint();
    const child = spawn(launch.file, launch.args, { cwd: launch.cwd, env: launch.env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    let timedOut = false;
    // A multi-byte character can split across two chunks; a decoding stream keeps it whole.
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    let done = false;
    const finish = (code, signal, spawnError) => {
      // A failed spawn can raise "error" and then "close"; the first one settles the run.
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (stdoutFile) writeFileSync(stdoutFile, out);
      if (stderrFile) writeFileSync(stderrFile, err);
      let result = null;
      try {
        result = JSON.parse(out);
      } catch {}
      resolveRun({
        code,
        signal,
        timedOut,
        spawnError: spawnError ? String(spawnError.message || spawnError) : null,
        started,
        ended: new Date().toISOString(),
        ms: Number((process.hrtime.bigint() - t0) / 1_000_000n),
        result,
        stdout: out,
        stderr: err,
      });
    };
    child.on("error", (e) => finish(null, null, e));
    child.on("close", (code, signal) => finish(code, signal, null));
  });
}
