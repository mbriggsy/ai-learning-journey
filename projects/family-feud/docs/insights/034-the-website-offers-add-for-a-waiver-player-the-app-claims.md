# 034 — The website offers ADD for a waiver player; the app claims

**Date:** 2026-10-06 · **Where:** sleeper.com league Players tab, Week 5 claim for Emanuel Wilson
· **Cost:** a refused add, then a wrong correction committed to this file that someone else had
to catch

## What happened

On the website, a player who is on waivers gets offered an **instant add** at both entry points:

- the row's `+` (`a.player-action-button.add`), and
- the player card opened by clicking his name. It shows **WATCH** and **ADD**, nothing else.

Choose a drop and press `ADD PLAYER`, and the server refuses: *"At least one of the players
being added in is on waivers."* Nothing gets submitted and no pending claim is created.

The row's React props show why. The web client's `waiverStatus` reads
`{status: "free_agent", clearTime: 0, waiverClearDateText: "Wed"}` for **every** waiver player
checked on 2026-10-06: Wilson, Coleman, Doubs and B. Robinson, 4 of 4. The client thinks they are
free agents. The server knows they are not.

**The claim worked in the Sleeper phone app.** Briggsy searched the player and selected him. Two
buttons sat beside his name, **Watch** and **"Wednesday"** (the waiver clear day). He tapped
Wednesday, then tapped the drop. The claim landed: My Waivers showed `E. Wilson / R. Odunze`,
Oct 6 9:41 am.

## The wrong correction this file first carried

The first version of this insight said the claim lived on the **website's** player card, and that
the "web can't claim" diagnosis had been wrong. That was inferred from Briggsy's description
without asking which client he used. Checking the web card afterwards showed WATCH + ADD. The
original diagnosis was right, and the correction was the error.

Caveat: the web card was read **after** our claim on Wilson was already pending. The row `+` of
three other waiver players, checked **before** any claim existed, also showed ADD, so the mismatch
is not caused by the pending claim. Re-check the web card on a player we have not claimed before
treating "the website cannot claim, in any state" as settled.

## Oracles

- **Pending claims are NOT in the public API.** `/v1/league/<id>/transactions/<week>` returns
  `[]` while a claim is pending. Do not read that as "no claim".
- **The oracle is the team page's WAIVER button.** It is the `.btn-container` whose text is
  `WAIVER`; its child `.btn` owns `onClick`, and it opens the *My Waivers* modal. That modal lists
  claim, drop and timestamp, with a **Cancel** under each claim. Read it and close it with the
  underlay, never by clicking near a claim.
- Waivers in this league process **Wednesday ~03:15 ET**, measured 09-16, 09-23 and 09-30.

## The rule

A user's report of what they clicked is **evidence about their client**, not yours. Before writing
"X was possible all along", reproduce X **in the client you are writing about**. And when one
entry point refuses an action, check the other entry points (row, card, team page) before calling
the client incapable. Here, both web entry points agreed, and only then is the incapability
claim earned.
