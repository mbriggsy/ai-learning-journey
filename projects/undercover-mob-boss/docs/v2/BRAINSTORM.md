# Undercover Mob Boss v2 — Brainstorm
*Started March 23, 2026*

---

## Philosophy

V1 is solid. V2 is refinement + soul.
The mechanics are proven. Now we make the *world* feel real.
Every card, every role, every policy should feel like it's *from* Millbrook City.

---

## Naming Changes

| V1 | V2 | Reason |
| --- | --- | --- |
| Police Chief | **Commissioner** | More political, more corrupt, more mob-adjacent |
| Good Policy | **Virtuous Policy** | Moral weight, not just "good" |
| Bad Policy | **Corrupt Policy** | Tells the story instantly |

Mayor and Mob Boss stay — those are perfect.

---

## Policy Cards — The Big Change

V1 had generic good/bad cards. V2 cards are *specific* — each one is a real Millbrook City vote.
Players will recognize real political battles. They'll laugh, argue, take sides.
The policies ARE the game flavor.

### Virtuous Policies (Citizens want these)

| Policy | Flavor |
| --- | --- |
| New Public Library | "Knowledge is power — unless you're the mob" |
| Broadband Expansion | "High-speed internet for every neighborhood" |
| School Lunch Program | "No kid goes hungry in Millbrook City" |
| Pothole Repair Initiative | "Fix the damn roads" |
| Community Health Clinic | "Healthcare where it's needed most" |
| Affordable Housing Fund | "Homes for working families" |
| Youth Recreation Center | "Keep the kids off the streets — the mob's streets" |
| Teacher Pay Raise | "Invest in the people who invest in children" |
| Clean Water Initiative | "No lead pipes. No exceptions." |
| Public Transit Expansion | "Get people where they need to go" |
| After-School Programs | "Safe spaces. Real futures." |
| Street Light Upgrade | "Light up the dark corners of the city" |

### Corrupt Policies (Mob wants these)

| Policy | Flavor |
| --- | --- |
| Stadium Deal | "Taxpayer-funded. Mob-owned." |
| No ID Required — Firearms | "The mob's favorite voter suppression... wait, wrong category" |
| Voter ID Requirement | "Make it harder to vote. For 'security'." |
| No Fluoride in Water | "Conspiracy sells. Science doesn't vote." |
| Police Oversight Removed | "Who watches the watchmen? Nobody. That's the point." |
| Zoning Variance — Harbor District | "Prime real estate. Suspiciously approved." |
| Parking Fine Amnesty | "For the connected. Obviously." |
| Surveillance Camera Network | "Watching everyone. Protecting no one." |
| Eminent Domain — Factory Row | "Your home is in the way. Of progress. Mob progress." |
| City Contract — No Bid Required | "Competition is overrated." |
| Casino License Fast-Track | "Approved in 24 hours. Suspiciously fast." |
| Pension Fund 'Restructuring' | "Don't worry about your retirement. We'll handle it." |

---

## Other V2 Ideas (To Explore)

### Gameplay
- **Veto mechanic** — players can call for a veto on a policy (already exists in SH, verify if v1 has it)
- **Post-game breakdown** — "here's every lie Dave told" replay feature
- **Spectator improvements** — eliminated players get a richer observer view

### Visual
- Policy cards show the actual policy name + flavor text
- Commissioner role card (new art)
- Distinct Virtuous vs Corrupt card back designs
- Animated policy card flip on enactment

### Audio
- New narrator lines for specific policies: *"The Stadium Deal passes. The mob smiles. The taxpayers don't."*
- Policy-specific sound effects

### UX
- Player can see their own past votes in a session history
- Host can show policy history on the board
- Timer visible on voting screen

---

## Folder Structure (V2 lives here)

```
undercover-mob-boss/
  v1/           ← frozen v1 source (reference only)
  v2/           ← active v2 build
  shared/       ← assets/audio/fonts used by both
  docs/
    v1/         ← v1 documentation (frozen)
    v2/         ← v2 documentation (this folder)
    shared/     ← rules, SH reference, user docs
```

---

## Build Methodology

Briggsy Modified Compound Engineering:
- Plan → Deepen → Work → Review → Compound (per phase, serial)
- CE deepen-plan runs between Plan and Work — no exceptions
- Deepen frontmatter flag: `deepened: true`
- Phases documented in `docs/v2/plans/`

---

## Next Steps

1. Keep ideating — more policy ideas, more V2 features
2. Write SPEC.md for v2
3. Run CE brainstorm session
4. Plan Phase 0 (policy card system + naming changes)
5. Build

---

*Nothing here is final. Add to it freely.*
