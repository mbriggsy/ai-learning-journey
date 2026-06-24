# On-disk task list — the single source of truth

Why this is a law, not a nicety:
- It's what lets the coordinator stay **context-light** — state lives on disk, not in the chat window.
- Agent Teams is experimental and `/resume` + `/rewind` do **NOT** restore in-process teammates. When a session resumes, the live team is gone — the task list is the ONLY record of where things stood. A recovering team-lead reads it to rebuild the picture.
- It's the durable channel the dark-coordinator deadlock proved you need: a queued chat message to an idle coordinator can be lost; a task on disk cannot.

Discipline (mirrors compound-engineering `ce-optimize`'s persistence rule):
- **If a result exists only in the conversation and not on the task list, you have a bug.** Write it down first.
- Seed the spine at launch: implement+gate+push · independent-verify · distill, dependency-chained (the implementer's task carries through commit/push — no separate "land").
- `TaskUpdate` from teammate RELAYS as they land — owner, status, and the key result (commit hash, gate verdict).
- The task list is the handoff: anyone (a resumed coordinator, the user, a new teammate) can read it and know the state.

## The on-disk reality (pinned — verified against CLI 2.1.183 + the live docs, 2026-06-19)

- **Task files:** `~/.claude/tasks/<team-name>/<taskId>.json`, where `<team-name>` is the session-derived name **`session-` + the first 8 chars of the session id** (e.g. session `093bac3c-…` → `~/.claude/tasks/session-093bac3c/1.json`). One JSON file per task, plus a `.lock` for concurrent writers.
- **Task schema:** `{ id, subject, description, activeForm, status, blocks[], blockedBy[] }` — `owner` is added when a teammate claims it. `status` ∈ `pending | in_progress | completed` (`deleted` removes it).
- **Team config:** `~/.claude/teams/<team-name>/config.json` — the member roster, and it persists **each teammate's full spawn prompt**. So a recovering lead reads back not just task state but the exact roles it dispatched.

**Resume reality (this is the recovery path):**
- A same-session `/resume` re-attaches to the **same** `session-<id8>/` dir — the tasks are all still on disk. What's gone is the live, in-process teammates (docs: "/resume and /rewind do not restore in-process teammates; the lead may attempt to message teammates that no longer exist"). The lead recovers by **reading the task list**, not by pinging dead peers.
- A **new** session gets a **new, empty** `session-<newid8>/` dir — it does *not* inherit a prior run's list. There is no "rejoin team X by name" (named teams are gone — see `mechanism-and-caveats.md`). To pick up a prior run from a fresh session, read its `session-<oldid8>/` dir by path.
