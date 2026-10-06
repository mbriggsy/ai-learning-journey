# 034 — A deep link to `/players` hides waivers; enter through the league

**Date:** 2026-10-06 · **Where:** sleeper.com league Players tab, Week 5 claim for Emanuel Wilson
· **Cost:** a refused add, then **two** wrong conclusions committed to this file. Briggsy caught
both.

## What is true (measured 2026-10-06, same account, same browser, minutes apart)

| how `/players` was reached | row button | player card | outcome |
|---|---|---|---|
| **typed URL** `…/leagues/<id>/players` (a cold load) | `a.player-action-button.add` | WATCH + **ADD** | ADD on a waiver player → server refuses: *"At least one of the players being added in is on waivers."* Nothing gets submitted. |
| **league home → click the Players tab** (in-app navigation) | `a.player-action-button.waiver`, text `W Wed` | WATCH + **W (Wed)** | that button **is the claim**. Pick the drop. Briggsy's Wilson claim landed this way on his laptop. |

On the cold load, the row's React props read `waiverStatus: {status: "free_agent", clearTime: 0}`
for every waiver player (4 of 4). The waiver data simply never gets loaded on that route. It is
the same `.waiver` class the 2026-09-25 TODO note recorded. **That note was right**; it was
measured through in-app navigation.

## The two wrong conclusions, so they are not re-derived

1. *"The website cannot claim; use the app."* That came from cold loads only. Wrong, because the
   route was the variable, not the client.
2. *"The claim lives on the website's player card."* I inferred that from Briggsy's description,
   then "refuted" it by checking the card **on a cold load** (which showed ADD) and decided he
   must have used the app. He was on his laptop. My refutation used the same broken route as the
   original failure. Both measurements shared the one variable that mattered.

## The rule

**Navigate the way the user does before you contradict the user.** A deep link is not the same
page as the page reached by clicking, when the app loads data per route. If your measurement
disagrees with a user's success report, first find the variable that differs between your path
and theirs. Don't tell them which device they used.

## Oracles

- **Pending claims are NOT in the public API.** `/v1/league/<id>/transactions/<week>` returns
  `[]` while a claim is pending.
- **The oracle is the team page's WAIVER button.** It is the `.btn-container` whose text is
  `WAIVER`; its child `.btn` owns `onClick`, and it opens the *My Waivers* modal. That modal lists
  claim, drop and timestamp, with a **Cancel** under each claim. Close it with the underlay.
- Waivers process **Wednesday ~03:15 ET** (measured 09-16, 09-23 and 09-30).
