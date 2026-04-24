# Dolores Grieves

**Role:** Agency HR Director. Recurring NPC (not in the operative roster; appears on action-card art).
**Archer archetype:** Pam Poovey.
**Debut:** `Intercepted` card, commit `048ab359` (2026-04-22).

## Visual DNA (locked — preserve in any future appearance)

- **Hair:** platinum blonde, high-upswept quiff.
- **Build:** broad-shouldered, plus-sized, confident posture.
- **Apparent age:** young — late 20s / early 30s.
- **Wardrobe:** cream scoop-neck sweater, pearl choker, small floral brooch.
- **Signature props:** clipboard with a bold red X stamp + thumbs-down gesture. These together are her denial move.
- **Setting when central to a card:** HR counter / HR office interior. Warm fluorescent light, filing cabinets in background.

## Archetype contract

Same 1:1 "visually archetype / named differently" rule as the core operatives:

- Dash Barlowe = Sterling Archer
- Vera Khan = Lana Kane
- Sable Ashworth = Cheryl Tunt
- Janet Broadside = Malory Archer
- Neal Proctor = Cyril Figgis
- **Dolores Grieves = Pam Poovey**

Breaking this contract changes what BURNED *feels* like — the Archer-tone-by-association is load-bearing for the product spec §2 quality bar ("Could this be a frame from an Archer episode?"). Dolores must read as Pam-coded even without being named as such.

## Imagen prompt landmines specific to this character

Learned across ~18 iterations on the Intercepted regen:

- **Direct IP reference works and is required.** Phrase: *"visually modeled on Pam Poovey from the animated show Archer."* Without this, Imagen defaults to the generic-slim-office-woman prior and drops every distinguishing feature.
- **"Plus-sized female character" triggers a cartoon cheek-blush oval artifact** that negative prompts do not eliminate. At card size (160-300px) the marks dissolve; at full-res they persist. Accepted.
- **Aggressive body-size metaphors ("HULKING", "TANK", "defensive lineman") backfire** — Imagen renders SMALLER and zooms out. Use calm specific markers ("broad shoulders, thick arms, plus-sized") OR the direct character reference above.
- **Blinds in the scene cast striped shadows on every surface**, unbreakably. Either close the blinds tight or remove them from the scene entirely (the Intercepted card removed them).

See `docs/insights/018-imagen-priors-engineer-around-dont-fight.md` for the generalized pattern.

## When she should appear

Open question — product call. Candidates for future cards that would benefit from her:

- Anything HR-adjacent: `call-in-a-favor` variants, performance-review scenes, denial beats.
- Any card where "administrative gatekeeper" would land the joke.

Do NOT force her into scenes that don't need the archetype — the visual-DNA rule cuts both ways.

## Assets

- Active: referenced via `Intercepted` card art (`public/assets/cards/intercepted.webp`).
- Archive pattern: `public/assets/cards/_archive/intercepted-<date>-<reason>.webp` for rejected variants.
