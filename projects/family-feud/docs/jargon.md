# Jargon — the project decoder

> The **mule** hauls **cargo** so data's always fresh, the engine reads it and warns about
> **cliffs**, the **ladder** turns that into an executable pick plan, **mutants** prove the
> tests work, and **oracles** prove everything else did.

That's the whole operation in one breath. The rest of this file unpacks it, one term at a
time — every term of art this project throws around, in plain English. Each entry says what the
word means here, where it came from (**ours** = we coined it, **textbook** = standard
software-engineering vocabulary, **fantasy** = borrowed from the fantasy-football community),
and where the real doctrine lives. This file explains words; it never overrides the doc it
points at.

---

## The mule — *ours*

The **hourly data courier**. `newsletter/feud_mule.ps1` runs every hour as the Windows
scheduled task "Family Feud Mule" and hauls 12 sources to disk — seven Sleeper endpoints plus
five fantasy RSS feeds — with two more draft-kit fetchers riding along. The point: at draft
time nothing depends on a network call, because the data's already home.

A pack animal that walks the same route every hour and carries cargo. That's the whole name.

Doctrine: [`data-access.md`](data-access.md) § "The mule".

## Cargo — *ours*

**What the mule carries** — the downloaded files sitting in `newsletter/data/inbox/`.
"Read the cargo" = use the fresh data already on disk instead of hitting the internet.
"Stale/dead cargo" = the deliveries stopped and you're reading old data.

`mule_status.json` is the **shipping manifest**: what arrived on the last haul, when, and
whether it passed inspection. Every payload is validated before it's allowed to land, and a
failed fetch keeps the previous cargo instead of destroying it. The cargo timestamp in the
manifest is the only real health signal — the scheduled task's "Last Result: 0" once read
healthy for hours while pointing at a deleted script.

Doctrine: [`data-access.md`](data-access.md).

## The ladder — *ours*

Your **ranked backup plan for a draft pick**. Not just "take Gibbs" — it's "take Gibbs; if
he's gone, Barkley; if he's gone, Jacobs; if he's gone, Pollard." Each name is a **rung**:
your guy gets sniped, you step down one rung instead of panicking.

It exists because of the clock. Burning a 120-second pick clock computing is how you lose,
so `scripts/precompute_ladder.py` builds the whole thing **before** you're on the clock (the
**standing ladder**, written to `newsletter/data/state/ladder.json`), and on the clock you
just execute the top surviving rung. Ladders run 3–4 names deep because a mock proved the
top target AND his fallback can both die in the five picks before your turn. "The QUEUE
leads" = the ladder gets loaded into Sleeper's actual queue panel, so even a missed clock
auto-picks off *our* list instead of Sleeper's generic ADP board.

(Second, unrelated use of the word: inside `consensus.py` a "ladder" is a position's ranked
list of players — same rungs metaphor, different machine. Context makes it obvious.)

Doctrine: [`draft-day-runbook.md`](draft-day-runbook.md) Steps 2–3.

## Tier cliff ("cliff") — *fantasy*

Players at each position are grouped into **tiers** — Tier 1 RBs are roughly interchangeable
studs, Tier 2 is a step down, and so on. A **cliff** is a tier about to run dry:
`RB T1: 1 left ⚠ CLIFF` means one stud remains, and after him the value **falls off a
cliff** to the next tier. That's a "grab him NOW or eat the drop" signal — the engine's
urgency logic is built on *which position is about to fall off a ledge*, not "who's the
best player." Tiers-and-cliffs drafting is standard fantasy-community strategy; we wired an
engine to scream it in real time.

Doctrine: [`ranking-methodology.md`](ranking-methodology.md); display rules in the runbook.

## Mutant — *textbook (mutation testing, 1970s)*

A **fake bug planted on purpose to prove the smoke detector works**. You don't wait for a
real fire to find out your smoke detector is junk — you hold a match under it. Same here:
deliberately break one small thing in the source (flip a comparison, delete a guard), run
the tests, and demand they go red.

The vocabulary is all industry standard, from Lipton/DeMillo/Sayward in the 1970s:

- **Killed** — the tests failed against the planted bug. Good: the detector caught the fire.
- **Survived** — the tests passed with broken code. Bad: a real bug of that shape would
  sail through. This is the finding mutation testing exists to produce.
- **Mutation score** — percent killed. "19-for-19" = 19 planted, 19 caught, 100%.
- **Mutation operator** — the rule for how you break it (e.g. "replace `+` with `-`").

The ritual around it is **ours**, paid for in scar tissue:

- **Verified addresses first** — before planting, confirm the sabotage lands on the exact
  line intended. A plant that silently no-ops (line-ending mismatch) reads as "weak test"
  when nothing was mutated; a plant that hits the wrong occurrence produces a real-looking
  red for the wrong reason.
- **Plant / red / revert / green** — the full cycle per mutant: plant the bug, see the
  tests fail, restore the source, see them pass again. The final green proves the code is
  back byte-identical and the red really came from the plant.
- **The blind spot** — a mutation suite only probes the axes you already suspected. Four
  killed mutants once read as "verified" while an off-by-one lived on the axis no mutant
  touched. Before trusting a clean run, ask: *what did none of my mutants probe?*

Doctrine: [`insights/019`](insights/019-the-mutants-only-probe-the-axis-you-already-suspect.md).

## Oracle — *textbook ("test oracle")*

The **independent judge that tells you whether something actually worked**. The rule it
encodes: a thing can never grade its own homework.

The three shapes it takes here:

- **The API over the browser.** The browser says the click succeeded? Don't care — *the
  browser is never the oracle for its own action.* A click once reported success and
  drafted nobody. `/picks` showing the pick actually landed is the oracle.
- **An outside authority over our own math.** The scoring function's oracle is nflverse's
  published `fantasy_points_ppr` — reproduced 2469/2469, so the math is proven against the
  world, not against itself.
- **Briggsy's eye over any test, on judgment surfaces.** No test measures whether an
  advisory reads clean under a draft clock. "The format's only oracle has fired" = Briggsy
  read the worked examples and ratified them.

Two hard rules ride with the word: **a missing oracle never blocks the run** (a dead mule
prints `[unverified]`, loudly, and keeps going), and **an oracle for another draft is not
evidence about this one** (cargo is ignored unless its `draft_id` matches).

Doctrine: [`draft-day-runbook.md`](draft-day-runbook.md);
[`insights/025`](insights/025-the-click-reported-success-and-drafted-nobody.md);
[`insights/010`](insights/010-exactly-one-candidate-was-treated-as-proof-of-identity.md).
