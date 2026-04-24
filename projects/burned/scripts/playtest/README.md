# BURNED Playtest Harness

> Operator-facing warning document. Read this **before** running any
> `pnpm playtest:*` command.

---

## 1. Purpose

The playtest harness drives an automated, deterministic-replay BURNED
session against a local `wrangler dev` + `vite dev` pair. It spawns N
Playwright-driven seat contexts (each a distinct Chromium profile, one
subagent per seat per Phase 4), subscribes to the server's `god-event` WS
stream, and produces a self-contained run directory under
`docs/testing/playtest/runs/<session-id>/` containing:

- `server/events.jsonl` — scrubbed god-event stream (one JSON per line).
- `server/connections.jsonl` — WS lifecycle transitions per seat.
- `seats/seat-N.log.md` — Phase 4 self-reports.
- `session.md` — start/end block + coverage summary.
- `coverage.md` — 7×2 info-gap grid (phase-1 D5) with fired-scenario IDs.

The harness is **operated by a human**. It is not a CI runner. It is not a
production health check. It exists to drive the calibration sessions
defined in Phase 6 and to surface divergences between the projection
surface today and what the rules + product spec say each viewer should see.

**Who runs it.** The BURNED engineer preparing a playtest session, on their
own workstation, against their own local dev servers.

---

## 2. Trust Model

The harness is **local-only, single-user**. It assumes:

- The operator runs against `localhost:8787` (wrangler) and
  `localhost:5173` (vite) on their own machine.
- The `PLAYTEST_TOKEN` is minted fresh per session (Unit 3b) — never
  committed, never reused across sessions.
- The `PLAYTEST_MODE=1` env flag is set ONLY in dev. Production bundles
  must never see it (enforced by the tree-shake sentinel test shipped in
  Phase 2 Unit 7).
- No inbound network exposes the playtest port. If you're tunnelling your
  dev server, disable the tunnel for the duration of the playtest.
- The god WS connection is gated by (origin allowlist) AND (token). Both
  checks MUST pass — a leaked token alone is insufficient without a
  matching origin.

**CI is a gap.** The v1 harness has no unattended-execution mode. Phase 6
calibration runs live on operator workstations. Future CI integration is
out of scope.

---

## 3. Session Dirs Are Diagnostic Artifacts

`docs/testing/playtest/runs/<session>/events.jsonl` and `connections.jsonl`
contain behavioral data — `boardView` snapshots, event timelines, seat
names, steal graphs. The scrubber (enabled by default) prevents
cross-session card-ID correlation by hashing card IDs with a per-session
salt AND stripping card identities from `myHand` snapshots, but it does
**NOT** prevent behavioral-pattern inference (a reader can still see who
stole from whom, who Noped what, and in what order).

**DO NOT share session dirs outside the team.** Before sharing any run
externally — for a bug report, a Discord post, a blog — run:

```bash
pnpm playtest:purge --full-dir <run-id>
```

…and share only what you've reviewed line-by-line.

---

## 4. `--no-scrub` Is Dangerous

`--no-scrub` disables the scrubber entirely. Raw `myHand` contents are
written to `events.jsonl` verbatim — card types, card IDs, identities.

Anyone with access to a `--no-scrub` run dir can reconstruct the full
information state of every seat at every turn. This is a deterministic-
debugging tool, not a sharable artifact.

- The orchestrator **banners loudly** at startup when `--no-scrub` is set.
- The resulting `session.md` is stamped `SCRUB_MODE: OFF`.
- Use **only** for scrubber-debugging or for a specific, time-boxed
  investigation.
- **Purge immediately** after the investigation:
  `pnpm playtest:purge --full-dir <run-id>`.

If you're not actively debugging the scrubber itself, leave scrub mode on.

---

## 5. Retention Is Automatic

Rolling `sessionDirRetention: 10` dirs by default. On every session
finalize, runs older than the 10 most-recent are **deleted** (not archived
— v1 is intentionally aggressive to keep the diagnostic-artifact surface
bounded).

If you need to keep a run, **copy it out of `docs/testing/playtest/runs/`
before the next session starts.** There is no "archive" button.

Manual purges:

```bash
pnpm playtest:purge --before 2026-04-20
pnpm playtest:purge --session-id 2026-04-22-1430-4p
```

Retention applies to session dirs only. The catalog (`SCENARIOS.md`) and
this README are never touched.

---

## 6. CI Gap

**v1 assumes a human operator.** The harness expects someone reading
console output, watching the orchestrator banner, hitting Ctrl-C on
anomalies, and running `pnpm playtest:purge` after sensitive runs.

**CI execution is out of scope for v1.** Rolling retention still applies
if the harness is ever scripted, but manual-purge semantics (the
`--no-scrub` investigation workflow, the "share outside the team"
protection) do not. Any future CI integration must either (a) ship with a
dedicated scrubber-on-exit hook that purges session dirs before the CI
job's workspace cleanup, or (b) gate the CI job behind a separate
least-privilege token that cannot be mint-and-forgotten from the
`PLAYTEST_TOKEN` flow.

If you're considering wiring the harness into CI, treat that wiring as a
new RFC, not an incremental PR.
