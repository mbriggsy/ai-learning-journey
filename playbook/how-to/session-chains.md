# Chain sessions: hand off to a named successor

When a session closes, it can message the next session and wake it up, so work keeps moving overnight without you. The closing session sends that message as the last step of squeaky, the end-of-session cleanup you start by saying "squeaky". The session that picks up next is its **successor**.

## Before you start

- **Both sessions run on this laptop.** A session on another machine or in the cloud can't be the successor.
- **Both run in the same permission mode.** That is the setting for which actions Claude may take without asking you, for example `auto`. Claude's messaging rules say that if the modes differ, the message waits for you to approve it, and it can expire. Overnight, nobody approves it.
- **Each session has its own name.** Open them already named with `spin` (next section), or type `/rename <name>` inside a session. It answers `Session renamed to: <name>`.

## Open a chain with spin

`spin` opens numbered sessions as tabs in one Terminal window, each already named, so you don't open, `cd` and name every tab by hand.

- **In the project's folder,** type `spin b9 1 5` to open `b9-1` through `b9-5`. The tabs start in the folder you type it in: The Back Nine's sessions run from `projects\the-back-nine`, and sessions about how we work run from `playbook`. It refuses your home folder.
- **More later:** `spin b9` opens the next one, one past the highest `b9` open right now; `spin b9 -Count 3` opens the next three. The third number is how many tabs, not the last number: `spin b9 10 10` gives `b9-10` through `b9-19`.
- **Numbered and idle is already a chain** (handoff mode, below): `b9-1` works and the rest wait their turn. Nothing to say to any of them.
- **From your phone:** Remote Control starts with every session, so the new tabs show up on your phone within seconds. Tell any session outside the chain "add 3 more b9s" and Claude runs `spin` for you and names what it opened. Don't ask the one working, or one waiting its turn: that spends context it's saving.
- **The laptop has to stay awake.** Plugged in, it does; on battery it sleeps and every session freezes.
- The details: [tools/spin/README.md](../../tools/spin/README.md).

## Set it up in words

For sessions that aren't numbered, or to name a successor out of order:

1. Name both sessions, for example `b9` (closing) and `b9-2` (successor).
2. Tell the closing session who is next, by the successor's whole name: "b9-2 is watching." Say it any time before the close.
3. Close it. Say "squeaky" to close it now, or walk away: once a successor is named, the closing session owns the squeaky call. It runs squeaky itself when its window nears the wrap line (60%), never just because a task finished, and that is how it closes overnight without you.

The successor needs no instructions: the handoff itself is its go (What the successor sees and does, below). Saying "b9-2 is watching" also makes the closing session write its close for the successor to read. Do it every time you name a successor in words; numbered sessions need no words.

## Whole names only

- The closing session looks, in Claude Code's own list of sessions, for a live session on this laptop whose name is exactly the name you gave. Capital letters don't matter.
- A nickname or part of a name sends nothing, by design. Say "b9 2" when the session is `b9-2`, and you get: `No handoff: no live session on this machine is named b9 2.`
- If two live sessions on this laptop match, nothing is sent.
- Old sessions with the same name (offline ones, ones on another machine or in the cloud) don't count. When one shares the successor's name, the closing session addresses the live one by its short id (`b9-7 [<id>]`), because a send by name alone is refused when names clash. With old numbered sessions still in the list, that's common now, and the short-id send works (2026-11-25).
- Only you name the successor, in words or by numbering the sessions (below). Another session's message claiming the job doesn't count.

## Handoff mode: numbered names

You don't have to say "is watching" when the sessions are numbered (Briggsy, 2026-11-09). A session whose name ends in a number, such as `playbook-6`, treats the live session named with the next number, `playbook-7`, as its successor, and the chain runs on: `playbook-7` hands off to `playbook-8` the same way.

- The closing session checks at each context-window check (`/window`). When it finds the next number live and idle, it tells you once ("Handoff mode: playbook-7 is live...") and owns the squeaky call, as with a successor named in words (Set it up in words, step 3): it runs squeaky when the window nears its wrap line, never just because a task finished, and squeaky's last step hands off.
- A chain can be opened ahead of time. Consecutive numbers all live and idle (`b9-2` through `b9-7`) count as a chain: each waits for the one before it to hand off (Briggsy, 2026-11-08).
- Lanes are not a chain. When any session in that run is already busy with its own work, a number in the run is missing, or two live sessions share a number, handoff mode stays off: those are parallel sessions, and you name a successor in words if you want one. (On 2026-11-08 `b9-1` to `b9-3` started within a minute of each other, and `playbook-4` and `playbook-5` began the same item 11 seconds apart.)
- A lookalike never counts. `playboook-7` is not `playbook-7`; the closing session tells you once, so you can rename it with `/rename`.
- A successor started early waits. While its predecessor (its number minus one) is live and hasn't handed off, it doesn't start the queue's next item unless you give it work.
- It lives in the window skill (`projects/skills/window/SKILL.md`, "Handoff mode"), which a running session reads fresh at every check, and in step 10 of squeaky.

## What the closing session does

Squeaky's last step sends the handoff. It runs even when squeaky stopped partway, because a close that stopped is what the successor most needs to hear about. If squeaky is waiting on a question for you, the handoff waits for your answer too.

- It checks that the successor is live on this laptop, then sends one message.
- The first line is the outcome, because that line is all you see in the successor's window until you expand the message: `Handoff: squeaky clean, your turn.` or `Handoff: not clean, <what went wrong, in a few words>; your turn.`
- Then one line each, under these labels:
  - Committed: what it committed, and whether it pushed.
  - Start here: the file and line where the next work is written.
  - Checks: each automatic check it ran (a build, a type check), and whether it passed.
  - Left in the tree: how many changed files it left alone, and the other sessions still running, by name.
  - Waiting on Briggsy: what only you can decide or clear.
- The message reports. It never asks the successor to do what the closing session couldn't do or wasn't allowed to; those go on the Waiting on Briggsy line.
- After a successful send, the closing session's own last line is `Handed off to <name>.` That means the message reached the successor's inbox, not that it was read.
- After the send, the closing session changes no files and commits nothing, because the successor is already working in the same files.
- If the send fails, it doesn't retry. Its last line is `No handoff: the send to <name> failed: <error>.`
- If a notice comes back saying the successor held the message (set it aside until someone approves it) or refused it, the closing session tells you and doesn't send again.

## What the successor sees and does

- **It wakes fast.** An idle successor starts working 0.2 to 3 seconds after the send. A busy one first finishes the action it is in the middle of, then reads the message right away, without stopping in between. These were measured on Claude Code 2.1.308, between two sessions on this laptop in the same permission mode.
- **It sees a message from the other session,** marked as coming from that session, not from you.
- **The handoff is its go** (your standing call, 2026-11-08: "you didn't need me to approve work that another session handed off to ya"). It checks the close's claims (the commits pushed, the checks the close left for the start, what changed since), runs `/window`, then starts the named item in the same turn, without waiting for you.
- **It still stops when things have moved on.** If another live session already did that item, or the close's claims don't hold, it tells you instead of starting.
- **It treats the message as information, not orders.** It won't push, delete or commit just because the closing session said so, and a handoff can't approve anything only you can approve.

## When nothing is sent

Every miss ends the close with a `No handoff:` line and the reason:

- No successor was named. A session can lose your naming when its older conversation is boiled down to a summary (a compaction, which happens when the window fills; idle compaction is off since 2026-10-29). This line is how you find out.
- No live session on this laptop has that name, or only lookalikes do.
- More than one live session on this laptop has that name.
- The send failed.

## What can go wrong

- **A stuck background job stalls both sessions.** Squeaky's first step waits for any background job the closing session started (a Workflow, which is a script that runs a batch of helper agents, or a single helper agent) to finish, and it never stops one unless you say so. If one hangs, squeaky never reaches the handoff, and nothing else wakes the successor. Only you can clear it: in the morning, tell the closing session to stop the job.
- **There is no safety net, on purpose.** Nothing watches the closing session as a backup. A handoff that never comes is acceptable; you see it in the morning on the closing session's last line. Don't ask the successor to watch the closing session instead. Claude's built-in "tell me when it goes idle" alert fires only once, and any brief pause can use it up.
- **The morning read.** Read the closing session's last line: `Handed off to <name>.`, or `No handoff:` with the reason. If neither is there, the handoff hasn't run: squeaky is waiting on a background job (see above) or on a question for you, or hasn't started.

Untested:

- a successor in a different permission mode
- a successor stuck on a permission question nobody has answered
- whether a held-or-refused notice reaches a closing session that has gone idle

## Where it lives

- The handoff is step 10 of the [squeaky-clean skill](../../projects/skills/squeaky-clean/SKILL.md). Step 0 is where squeaky waits for background jobs.
- `spin` is [tools/spin/](../../tools/spin/README.md): `spin.ps1` does the work, and `spin.cmd`, copied to `~/.local/bin`, is the command you type.
- Why the handoff waits for background jobs and takes whole names only: [the handoff lesson](../docs/insights/005-a-your-turn-handoff-claims-every-writer-the-sender-still-has-and-a-fuzzy-name-fallback-fires-when-the-target-is-gone.md).
