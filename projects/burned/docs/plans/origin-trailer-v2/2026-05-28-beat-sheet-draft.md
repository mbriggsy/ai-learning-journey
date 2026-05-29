# Origin Trailer v2 — Beat Sheet DRAFT (2026-05-28)

**Status:** DRAFT v4 for review. Built against the LOCKED engine
(§DECISION in `2026-05-24-origin-event-brainstorm.md`), the 6-point bar
(`…-principles.md`), and the 6-beat spine (`…-trailer-structure.md`).

**Voice = Janet** — Malory-CODED dry matriarch, outside-observer,
grudgingly impressed (CODED cadence, never cloned).

### v2 changes (Briggsy review notes, 2026-05-28)
- **FIXED — borrowed UMB mechanic:** removed "disconnecting/quitting
  mid-vote." **BURNED has no voting** (verified vs spec §1 — it's a
  faithful Exploding Kittens port). Gauntlet chaos is now BURNED-true.
- **ADDED — game logline:** a quick one/two-liner so the viewer actually
  knows *what BURNED is* ("we don't recognize it"). Folded into the open.
- **ADDED — the double-down beat:** he made the bet, then made it *harder*
  on purpose (networked, TV + 10 phones, secret hands, commercial polish).
- **ADDED — scale showcase:** real measured numbers as escalating images
  (code → test code → planning), punchlined on the 5.4× planning ratio.
- **KEPT (BURNED-native, not copied):** adversarial "challenger" agents
  hunting the game's weak points — UMB DNA, BURNED specifics.
- **Runtime expanded** ~93s → ~119s to hold the new material.

### v3 changes (Briggsy review notes, 2026-05-28)
- **Bet → certainty.** He couldn't build it *himself*, but he had no doubt
  a *machine* could. The doubt is moved entirely to Janet — sharpens the
  #2 engine (her skepticism is the arc; his certainty is the counterpoint).
- **"I counted five"** replaces "it measured five" (Janet as witness, drier)
  and **drops** the spoken "Five times more planning than code" — the
  on-screen number cascade carries the ratio; the line was redundant.
- **"up to ten"** for player count (2–10, not always 10) — both spots.
- **Runtime** — "Takes as long as it takes." No trimming. (The ~119s figure
  here is SUPERSEDED — see v5 changes; real est. ~216–265s.)

### v4 changes (number correction, 2026-05-28)
- **CRITICAL FIX — wrong scope.** The v2/v3 numbers (16K code / 10K tests /
  85K planning / 1,413 tests / "5×") were ad-hoc `git` counts scoped to
  `src/` for code but ALL docs for planning — apples-to-oranges, and they
  **contradicted the published stats site**. Briggsy caught it (the site
  says 62K planning, not 85K).
- **Now using the canonical, Briggsy-locked site buckets** (the trailer
  MUST agree with the public stats site): Application LOC **43,357**,
  testing **29,033**, planning **62,082**, test cases **1,326**.
- **"I counted five" is DEAD** — false on real numbers (planning ÷ app =
  1.4×, not 5×). Replaced with button 1: "More planning than code.
  'Measure twice,' they say. This one never stopped." — TRUE (62K > 43K)
  and keeps the over-planning DNA.
- All test-count instances 1,413 → **1,326** (gauntlet, proof ×2, tag).

### v5 changes (runtime reality, 2026-05-28)
- **CRITICAL FIX — the ~119s target was never real.** Authoring the cue list
  (`videos/origin-trailer/scripts/voice/script.ts`) + `pnpm cues:check`
  measured the approved prose at **529 spoken words + 12.8s of silence** =
  **est. ~216–265s** at Janet's pace (~2.1–2.6 wps; the `tts:test` line ran
  ~19 words in ~8s). The ~119s figure was never validated against
  word-count × pace — it implied ~4 wps, which this dry-matriarch voice
  never hits.
- **Briggsy's call (2026-05-28): ACCEPT THE LONGER CUT.** Keep all approved
  prose; runtime is **~3–3.5 min** ("takes as long as it takes"). No
  trimming. Exact runtime confirmed at the generation+measure pass.
- **The per-beat "~Ns" header labels below are SUPERSEDED estimates** —
  `pnpm cues:check` is the runtime source of truth. The proportional shape
  (warm #4 open · #2 owns the spine · #3 tag short) still holds.

**Real facts used (CANONICAL — from the published stats site; NOT ad-hoc git counts):**
- **Application LOC: 43,357** (code: source + styles + markup) ·
  **Testing: 29,033** (tests + fixtures) · **Implementation planning:
  62,082** (docs/plans) · **Total authored: 190,402**. Source:
  `projects/ai-journey-stats/public/data/stats.json` (refreshed
  2026-05-28), computed by `tools/project-metrics`, bucket definitions
  Briggsy-locked 2026-05-27 (`ai-journey-stats/src/lib/composition.ts`).
- **Test cases: 1,326** (the site's published static count). `npx vitest
  list` reports 1,413 at runtime (it.each expansion) — the trailer uses
  the site's **1,326** so the two never contradict in public.
- Spoken roundings round DOWN (honest): "forty-three thousand" /
  "twenty-nine thousand" / "sixty-two thousand" / "thirteen hundred and
  twenty-six."
- **The TRUE flex:** planning (62K) **exceeds** the application code (43K)
  — "more planning than code." (NOT 5×; do not resurrect that.)
- Game = faithful Exploding Kittens: Party Pack port — 120-card deck,
  2–10 players, same-room; one shared TV screen + private phone
  controllers; lose by drawing **BURNED**. World = The Pendleton Agency.
- Stack Briggsy had never touched: React 19 + TS + Vite 8 + Framer Motion,
  Cloudflare Workers Durable Objects. He wrote no code — direction,
  taste, ambition.

**Target runtime:** ~3–3.5 min (est. ~216–265s, confirmed at generation;
see v5 changes — the old ~119s was unvalidated and is dead). Proportions
still honor the shape: warm #4 open, #2 owns the spine, #3 tag short.

---

## Beat 1 — OPEN + WHAT IT IS  ·  engine #4 + logline  ·  ~16s  ·  bar 1,2 / peak: intrigue+laugh

**Job:** Warm true funny cold-open AND tell the viewer what the game is.
Hook + grounding in the first breath.

**VO (Janet):**
> "Every great operation begins the same way. Not in a war room. Not with
> a directive from on high. It begins with bourbon, a folding table, and a
> card game nobody could stop playing.
>
> The rules are simple. Draw a card. Don't draw the one that gets you
> *burned*. And do everything short of decent to make sure the person next
> to you draws it first. Last cover standing wins."

**Visual:** Game-night warmth (bourbon, cards mid-throw, lamplight) →
quick punchy gameplay flashes that literally show the logline (a hand
drawing, the BURNED card, a friend groaning out).

**Bar:** human + place + a smile in ~10s (1); every noun a concrete image
(2); viewer now knows what BURNED *is*.

---

## Beat 2 — THE BET  ·  engine #2 (spine starts)  ·  ~10s  ·  bar 1 / peak: "wait, really?"

**Job:** State the dare. The thesis. Plant the skepticism through-line.

**VO (Janet):**
> "The man at that table builds spreadsheets for a living. Pipelines. The
> quiet machinery nobody thanks you for. One night — several bourbons
> deep — he decided that card game deserved a screen. There was just the
> one problem. He had no idea how to build it *himself*. *[beat]* That a
> machine could? He hadn't a flicker of doubt.
>
> *[dry]* I had several. I gave it two weeks."

**Visual:** Warm table → dark screen, a blinking cursor. The bet is the
hero (Briggsy abstracted — see open question #2).

---

## Beat 3 — THE DOUBLE-DOWN  ·  engine #2 spine  ·  ~13s  ·  bar 2 / peak: rising stakes

**Job:** The escalation Briggsy asked for — he didn't make it easy on
himself, he made it *harder*. Each clause is a real, harder bet.

**VO (Janet):**
> "Now — a sensible man builds something small. One screen. One player. A
> toy. *[beat]* He did the opposite. He wanted up to ten of you in the same
> room. A television running the table, ten phones hiding ten secret
> hands, every move landing the instant you made it. And it had to look
> like a real studio made it — or it wasn't worth making.
>
> He didn't raise the bar once. He kept moving it out of his own reach."

**Visual:** The form factors snapping into being — TV + a fan of phones,
secret hands, the polished Archer-grade table. Ambition made literal.

**Bar:** concrete images, not jargon (2); escalates the stakes before the
build pays them off.

---

## Beat 4 — THE BUILD + SCALE  ·  engine #2 spine  ·  ~22s  ·  bar 2,3,4 / peak: awe → deadpan

**Job:** The method + the SCALE, as escalating concrete numbers. Honest
flex begins.

**VO (Janet):**
> "He didn't write it. Any of it. He pointed — and the machine wrote.
>
> Forty-three thousand lines of code, in a language he'd never touched.
> Twenty-nine thousand more, written for the sole purpose of attacking the
> first forty-three. And sixty-two thousand lines of planning behind all
> of it.
>
> *[beat]* More planning than code. *[dry]* 'Measure twice,' they say.
> *This* one never stopped."

**Visual:** Numbers stamping on screen —
43,000 → 29,000 → 62,000 — planning standing as the tallest bar of the
three. "More planning than code" is the visual punchline (true: 62K > 43K).

**Bar:** stats delivered as escalating *images* with a deadpan turn (2,3);
autonomy owned honestly — "he didn't write it. Any of it." (4).

---

## Beat 5 — THE GAUNTLET (challenger agents)  ·  engine #2 spine  ·  ~18s  ·  bar 2,3 / peak: laugh

**Job:** UMB-DNA adversarial testing, BURNED-native. The comedy engine.
NO voting.

**VO (Janet):**
> "Then it did the genuinely deranged thing. It unleashed a swarm of
> adversaries — agents whose only job was to hunt the game's weak points
> and break them.
>
> They played drunk. They rage-tapped the glass. They forced each other
> into certain death and enjoyed it. They yanked their phones offline
> mid-turn, just to see what would fall over.
>
> Thirteen hundred and twenty-six times."

**Visual:** The challenger swarm — phone UIs hammered, BURNED cards forced
onto opponents, disconnect spinners, a chaos counter climbing to 1326.

**Bar:** vivid true images, zero jargon (2); the drunk-spiteful-agents
picture in Janet's deadpan is the cold-viewer laugh (3). All chaos is
BURNED-true (forcing the BURNED draw, disconnects) — no borrowed voting.

---

## Beat 6 — THE PROOF + COST  ·  engine #2 spine  ·  ~24s  ·  bar 3,5,4 / peak: release → warmth

**Job:** The deadpan snap (it held), then the human toll — the heart.
BURNED-native, NOT UMB's caffeine button.

**VO (Janet):**
> "Thirteen hundred and twenty-six attempts to break it. *[beat]* Thirteen
> hundred and twenty-six times, it didn't. The most belligerent test
> subjects ever assembled — and the only thing in the room that never once
> fell over was the one built by the machine.
>
> *[turn — softer]* What did it cost him? Not code — he never wrote a word
> of it. It cost him sleep. A lot of sleep. The specific madness of a man who'll stand
> over a screen at two in the morning and tell a machine, 'no — make it
> *beautiful*' — to a thing that doesn't have eyes. He gave it taste.
> Ambition. An unreasonable refusal to accept 'good enough.' *[beat]* The
> machine did the rest."

**Visual:** Chaos resolves to a clean holding screen, counter locks
**1326 / 1326** → cut to a late-night desk, one lamp. Dryness softening to
affection.

**Bar:** earned deadpan snap (3); real self-deprecating cost (5); flex
owned without a brag — "the machine did the rest" (4). "built by the
machine" + "a thing that doesn't have eyes" both pre-load the tag's reveal
(the machine made everything — including, it turns out, the voice).

---

## Beat 7 — RETURN + TAG  ·  engine #3 subset  ·  ~16s  ·  bar 4,6 / peak: satisfaction → gut-punch

**Job:** Gameplay payoff + the honest claim + the gut-punch button.

**VO (Janet):**
> "What did he get in return? *[beat]* A game. A real one. A hundred and
> twenty cards, up to ten of your closest friends, and not one shred of
> honor among them.
>
> He bet a machine could build something worth playing. *[beat]* He was
> right.
>
> And not one word of this — the game, the swarm, the thirteen hundred
> tests… this very trailer… came from his hand."
>
> *[long beat — air]*
>
> "Including mine."
>
> *[hold — the reveal detonates in silence, on black. Do NOT crowd it.]*
>
> *[then, unhurried — the matriarch's guard drops a half-inch]*
>
> "This kid is starting to impress me." *[beat]* "…Hmph."

**Visual:** Real gameplay — friends laughing/betraying each other on TV +
phones. Title card **BURNED**. Black on "Including mine." Hold black
through the final warm button.

**Why the second button works:** it lands the principles-doc bookend out
loud (skeptic → grudgingly impressed — the #2 engine's final note) AND
re-humanizes Janet immediately after the reveal that she's synthetic. The
trailer ends on *warmth*, not on the clever twist — the antidote to the
"wow, Claude built this" trap. "This kid" is Malory's power-diminutive:
affection without upstaging the protagonist.

**The non-negotiables (or the tag gets cut):**
1. Janet reads as a fully-real person the entire runtime — zero earlier
   hints she's synthetic. One wink kills it.
2. **Double-button timing is sacred.** "Including mine" gets its FULL
   silent detonation FIRST. Only after the reveal lands does the warm
   "This kid…" button return. If the second line crowds the first, the
   gut-punch dies and the warmth gains nothing.
3. The reveal fires *after* the beat-6 heart, never instead of it.
4. Never explained. "This kid is starting to impress me" expresses
   *feeling*, not exposition — it must NOT explain the reveal.

**Production flag:** "…Hmph." is a non-verbal — the Eleanor voice asset
may need coaxing to perform it, or it drops to a breath. Test, don't
assume.

---

## Open questions for review

1. **#4 open footage** — real game-night footage, or stylized
   Briefing-Room recreation? Changes how "true images" in beat 1 read.
2. **Briggsy on screen?** Draft keeps the bet the hero (silhouette /
   back-of-head). Confirm — face or no face.
3. ~~Runtime~~ — RESOLVED: ~3–3.5 min (accept the longer cut, no trimming;
   the ~119s target was unvalidated — see v5 changes). "Takes as long as it takes."
4. **Scale visual** — do the numbers stamp as plain type, or as the
   Archer-style cascade the v1 infra already built (`s04-receipts-cascade`
   in `videos/trailer/out/`)? Reusing that asset's motion may save a build.
5. **"Including mine" exact wording** — pressure-test: *"Including these
   words."* / *"Including the voice."* / *"Including mine."* (current).
6. **Logline placement** — currently front-loaded (beat 1). Alt: a thinner
   seed up front + fuller logline at the beat-7 payoff. Front-load reads
   clearer; flag if it feels like it slows the open.
