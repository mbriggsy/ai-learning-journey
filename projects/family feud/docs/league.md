# The League — Family Feud 2026

Identity and rules. Everything here is **read from the live Sleeper API**, not from memory.
Doctrine built on top of these facts lives in [`ranking-methodology.md`](ranking-methodology.md);
draft-day operation lives in [`draft-day-runbook.md`](draft-day-runbook.md).

> **Verified 2026-08-07 13:54** against `newsletter/data/inbox/sleeper_league.json`,
> `sleeper_draft.json` and `sleeper_users.json` — the mule's own cargo, fetched that minute.
> Membership and draft timing move; re-pull before quoting them. See
> [`data-access.md`](data-access.md) for how.

## Who's in it

| Sleeper | user_id | Who | Notes |
|---|---|---|---|
| **PoppaBriggsy** | `1390750540631150592` | **Briggsy** — this is us | Team: **Saquon Deez Nuts**, roster_id 3 |
| briggsy007 | `959308419154886656` | Hunter, his son (26) | **Commissioner** (`is_owner: true`). The mission is beating him. |
| RMonk9 | `959230356757045248` | league member | |
| MattiICE23 | `946163712933732352` | league member | |

**4 of 8 seats filled** as of the 13:54 pull. Four are still empty, so any "who picks between
us" reasoning built today is provisional — the room is not the room yet.

## League

- **"Family Feud"**, league_id `1390509993844809728`, season **2026**, **8 teams**, status `pre_draft`
- **Draft:** draft_id `1390509994847240192` — **snake**, **16 rounds**, **120s** clock,
  `reversal_round: 0` (plain snake; third-round reversal is off, and Briggsy ruled it out Aug 5)
- `start_time: null` and `draft_order: null` — **Briggsy's slot is genuinely unknown until near
  go time.** Informally targeted ~Aug 29. The slot is the engine's first argument, so this is
  the one fact draft morning must resolve before anything else.
- `type: 0` = **redraft.** (`max_keepers: 1` and `draft_rounds: 3` are Sleeper's vestigial
  keeper defaults and mean nothing in a redraft league — don't let them spook you.)

## Lineup

`QB · RB · RB · WR · WR · TE · FLEX · FLEX · K · DEF` + **6 bench** + **2 IR** (`reserve_slots: 2`).

IR accepts **OUT, SUS, COV** (`reserve_allow_out/sus/cov: 1`); it does **not** accept
DOUBTFUL, DNR or NA. That eligibility is what makes the IR-stash play real — a star ruled
OUT parks for free, a merely doubtful one does not.

## Scoring — full PPR

**Offense**

| | |
|---|---|
| Receptions | **1.0** (full PPR) |
| Passing | 0.04/yd · **4** per TD · −1 INT · 2 per 2PT |
| Rushing / Receiving | 0.1/yd · **6** per TD · 2 per 2PT |
| Fumbles | −2 lost (0 for the fumble itself) |
| **Long-TD bonuses** | **+1** at 40+ yds and **+2** at 50+ yds — on pass, rush AND receiving TDs. **They STACK.** |

**Stacking matters.** Sleeper's support documentation states the 40+ and 50+ TD bonuses "will
stack," so a 55-yard receiving TD scores 6 + 1 + 2 = **9 points**, not 8. (Yardage bonuses do
*not* stack — only the highest tier applies — but this league has none, so the distinction never
comes up here.) A long-TD threat is therefore worth slightly more than the raw table suggests,
which cuts the same direction as ceiling-over-floor.

The bonuses are also easy to miss in the raw JSON: they are keyed `pass_td_40p`,
`rush_td_50p`, `rec_td_40p` and so on — the word "bonus" appears nowhere in the key names.
They are part of the exact scoring the VORP projections were built against, and they quietly
reward the boom archetype that [`ranking-methodology.md`](ranking-methodology.md) argues for.

**Kicker** — FG 0-39: 3 · 40-49: **4** · 50-59: **5** · 60+: **6** · miss: **−1** · XP: 1 · XP miss: −1

Distance-weighted, with a real miss penalty. Leg strength and dome/altitude matter here more
than in flat 3-per-FG leagues — which is the scoring reason the board's elite-K tier exists.

**Defense / ST** — TD 6 · sack 1 · INT 2 · fumble recovery 2 · forced fumble 1 · blocked kick 2 · safety 2

Points allowed: **0 pts → 10** · 1-6 → 7 · 7-13 → 4 · 14-20 → 1 · 21-27 → 0 · 28-34 → **−1** · 35+ → **−4**

That −4 floor is why streaming a defense into a bad matchup is genuinely expensive, not merely low-upside.

## Season structure

- **Playoffs: 6 of 8 teams**, starting **week 15**, title decided week 17.
  This is the single most load-bearing fact on the board — it is the whole basis of
  ceiling-over-floor. See [`ranking-methodology.md`](ranking-methodology.md).
- **Trade deadline: week 11.** Trades enabled (`disable_trades: 0`), 1-day review,
  6 votes to veto.
- **Pick trading enabled** at the league level (`pick_trading: 1`). Note this is *not* the same
  as trading picks mid-draft — Briggsy's ~100 drafts say the clock doesn't allow that in
  practice, and `/traded_picks` returned `[]`. One check on draft morning covers a *pre*-draft
  trade; don't build tooling for in-draft trades.
- **Waivers: rolling priority** (`waiver_type: 0`), 1-day clear.
  `waiver_day_of_week: 2` — the older notes read this as Wednesday processing with a Tuesday
  report. **Unconfirmed against a live waiver cycle**; worth one look in week 1 rather than
  a guess. (`waiver_budget: 100` is present but inert — FAAB only applies when `waiver_type`
  is FAAB, and it isn't.)
