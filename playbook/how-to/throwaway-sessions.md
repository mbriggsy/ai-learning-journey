# Throwaway background sessions

A throwaway is a second Claude session that runs in the background, started with `claude --bg`. Use one when a test needs a real second session, such as checking that a message from one session reaches another, and nobody needs to sit at its keyboard. Claude starts it, reads what it did, and deletes it. You never type any of this.

## Start one

```
claude --bg -n <name> --permission-mode auto --effort low "<prompt>"
```

- `--bg` starts the session in the background and hands control straight back. It prints a short id. Keep it: `stop` and `rm` need the id.
- `-n <name>` gives it a display name. Pick one that says what it is, such as `throwaway-msg-test`, so it is easy to spot and clean up.
- `--permission-mode auto` sets which actions it may take without stopping to ask. Match every session it trades messages with, sending or receiving; we run `auto`. When the modes differ, the session receiving a message holds it until a person approves it, and the hold can run out. A throwaway has nobody to approve one (see [session chains](session-chains.md)).
- `--effort low` sets how hard it thinks (the choices are low, medium, high, xhigh, max). Low suits a short scripted test.
- `"<prompt>"` is its whole job, in quotes. Write everything it should do into the prompt, including what to do when a message arrives. A message from another session counts as information, not an order, so the throwaway acts on one only if its prompt says to.

## Launch it from the repo

- Launch it from the repo folder or a folder inside it. In a folder Claude Code hasn't been told to trust, it refuses and says "Workspace not trusted".
- Never hand-edit the trust settings in `~/.claude.json` to get past that.
- The one exception is the probes' trusted folder, `claude-probe-q8-trusted` in the system temp folder. You approved it once, on 2026-10-23, and Claude wrote it through the settings writer, never by hand. A folder inside it counts as trusted too, so each probe run makes a fresh folder there and starts its throwaway in it. That approval lives on this laptop only: a new machine needs it again.
- A git worktree is a second copy of the repo in a folder of its own. A throwaway launched from the repo's main folder (the main checkout) makes none: `git worktree list` shows the same list before and after. Leave out `-w` / `--worktree`, which makes one on purpose.

## See what it is doing

- `claude logs <id>` prints its recent screen output. Part of its name works in place of the id; put a name with spaces in quotes.
- `claude agents --json` lists the sessions running right now, both the ones you type into and the background ones, each with its `name`. A background one also shows its `id`, so a lost id can be found there.
- Its status file in `~/.claude/sessions/` (one file per running session) says what it is doing: `busy` while it works, `idle` when its turn is over, `waiting` while a permission prompt is open (a throwaway has nobody to answer one), and `shell` when its turn is over but a background command it started is still running.
- When it finishes its prompt it goes idle (waits for its next message) instead of closing, so another session can still message it. Don't count on it closing itself.

## Clean up every one

Claude runs both steps, in this order, on every throwaway it starts, before its own session ends:

1. `claude stop <id>` stops it. Its conversation is kept for now.
2. `claude rm <id>` deletes it, including its whole folder under `~/.claude/jobs/`. It also works on one that has already exited, and it deletes the session's worktree too, if it has one and that is safe. Until it runs, the throwaway also shows in your Remote Control session list.

Clean up each one by its own id. Never run `claude daemon stop`: it ends every background session at once, not just the throwaway.

Then check with `claude agents --json --all`, which lists the running sessions plus the background ones that have finished (a finished one shows a `state` such as `stopped` or `done`). A removed throwaway is no longer in that list.

## Related

- [Session chains](session-chains.md): handing off from one session to a named successor. A throwaway lets Claude test that handoff without tying up one of your own sessions.
