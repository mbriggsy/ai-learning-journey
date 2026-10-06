# 034 — The waiver claim lives on the player card, not the `+`

**Date:** 2026-10-06 · **Where:** sleeper.com league Players tab, Week 5 claim for Emanuel Wilson
· **Cost:** one wrong diagnosis handed to Briggsy ("the web can't claim"), fixed by him in 30 seconds

## What happened

The row `+` on the Players tab (`a.player-action-button.add`) opens an **Add Player** dialog for
every unrostered player, including those on waivers. On a waiver player, picking a drop and
pressing `ADD PLAYER` gets refused by the server with *"At least one of the players being added
in is on waivers."* Nothing is submitted. Not even a pending claim gets created.

The row's React props carry `waiverStatus: {status: "free_agent", clearTime: 0,
waiverClearDateText: "Wed"}` for **every** waiver player checked (Wilson, Coleman, Doubs,
B. Robinson), and that stale status is why the `+` offers Add instead of Claim. I read that as
"the website cannot claim" and sent Briggsy to the phone app. Wrong.

## The actual control

Click the **player's name** to open his card. The card carries two buttons beside the name:
**Watch**, then a button labelled with the waiver clear day (**"Wednesday"**). That second
button is the claim. Pick it, then pick the drop. Briggsy did exactly this on 2026-10-06 and it
landed.

Note the prop already said so: `waiverClearDateText: "Wed"` is the label of the claim button.
The status field was stale, but the claim path was never missing.

## Oracles

- **Pending claims are NOT in the public API.** `/v1/league/<id>/transactions/<week>` returns
  `[]` while a claim is pending. Do not read that as "no claim".
- **The oracle is the team page's WAIVER button** (`.btn-container` containing `WAIVER` →
  its `.btn` owns `onClick`) → *My Waivers* modal. It lists claim, drop and timestamp. The
  modal has a **Cancel** under each claim. Close the modal with the underlay, never by clicking
  the text near the claim.
- Waivers in this league process **Wednesday ~03:15 ET** (week 3's claims all resolved
  Wed 09-30 03:15). Players who played on Sunday sit on waivers until that run.

## The rule

When one entry point refuses an action, map the **other** entry points to the same object
(row, card, team page) before you declare the action impossible on that client. "This button
can't do it" is not "this client can't do it."
