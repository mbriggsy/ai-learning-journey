# Chain sessions: hand off to a named successor

When a session closes, it can message the next session and wake it up, so work keeps moving overnight without you. The closing session sends that message as the last step of squeaky, the end-of-session cleanup you start by saying "squeaky". The session that picks up next is its **successor**.

## Before you start

- **Both sessions run on this laptop.** A session on another machine or in the cloud can't be the successor.
- **Both run in the same permission mode.** That is the setting for which actions Claude may take without asking you, for example `auto`. Claude's messaging rules say that if the modes differ, the message waits for you to approve it, and it can expire. Overnight, nobody approves it.
- **Each session has its own name.** Type `/rename <name>` inside the session. It answers `Session renamed to: <name>`.

## Set it up

1. Name both sessions, for example `our setup 6` (closing) and `our setup 7` (successor).
2. Tell the successor what to do when the message comes: "our setup 6 hands off to you when it closes; when its message arrives, pick up where it says to start." It acts on the message only as far as these instructions say.
3. Tell the closing session who is next, by the successor's whole name: "our setup 7 is watching." Say it any time before the close.
4. Close it. Say "squeaky" to close it now. Or, before you walk away, tell it to run squeaky on its own at a good stopping point; that is how it closes overnight without you.

Saying "our setup 7 is watching" also makes the closing session write its close for the successor to read. Do it every time.

## Whole names only

- The closing session looks for a live session whose name is exactly the name you gave. Capital letters don't matter.
- A nickname or part of a name sends nothing, by design. Say "setup 7" when the session is `our setup 7`, and you get: `No handoff: no live session on this machine is named setup 7; our setup 7 only contains it.`
- If two live sessions match, nothing is sent.
- Only you name the successor. Another session's message claiming the job doesn't count.

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
- **It treats the message as information.** It won't push, delete or commit just because the closing session said so. It does what your instructions to it say.

## When nothing is sent

Every miss ends the close with a `No handoff:` line and the reason:

- No successor was named. A session can lose your naming when its older conversation is boiled down to a summary, which also happens to an idle session about 55 minutes after its last reply. This line is how you find out.
- No live session on this laptop has that name, or only lookalikes do.
- More than one session has that name.
- The named session isn't proven to be running.
- Squeaky couldn't check which sessions are live.
- The closing session may be open in a second terminal window too, so squeaky can't tell which copy's work is which.

## What can go wrong

- **A stuck background job stalls both sessions.** Squeaky's first step waits for any background job the closing session started (a Workflow, which is a script that runs a batch of helper agents, or a single helper agent) to finish, and it never stops one unless you say so. If one hangs, squeaky never reaches the handoff, and nothing else wakes the successor. Only you can clear it: in the morning, tell the closing session to stop the job.
- **There is no safety net, on purpose.** Nothing watches the closing session as a backup. A handoff that never comes is acceptable; you see it in the morning on the closing session's last line. Don't ask the successor to watch the closing session instead. Claude's built-in "tell me when it goes idle" alert fires only once, and any brief pause can use it up.
- **The morning read.** Read the closing session's last line: `Handed off to <name>.`, or `No handoff:` with the reason. If neither is there, the handoff hasn't run: squeaky is waiting on a background job (see above) or on a question for you, or hasn't started.

Untested:

- a successor in a different permission mode
- a successor stuck on a permission question nobody has answered
- a session on another machine or in the cloud with the same name as the successor
- whether a held-or-refused notice reaches a closing session that has gone idle

## Where it lives

- The handoff is step 10 of the [squeaky-clean skill](../../projects/skills/squeaky-clean/SKILL.md). Step 0 is where squeaky waits for background jobs.
- Why the handoff waits for background jobs and takes whole names only: [the handoff lesson](../docs/insights/005-a-your-turn-handoff-claims-every-writer-the-sender-still-has-and-a-fuzzy-name-fallback-fires-when-the-target-is-gone.md).
