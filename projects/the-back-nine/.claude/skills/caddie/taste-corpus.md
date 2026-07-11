# The Taste Corpus — Briggsy's Recorded Verdicts, Distilled

**What this is.** The N=1 cold-reader's actual judgment, harvested from every verdict he has
recorded (docs/council-log.md, TODO landmines, docs/insights/069, the global memory feedback
files) and distilled into reviewer-usable rules. **Every rule here traces to a real incident —
nothing is invented.** This file is the substrate the Caddie's readers are calibrated from:
the verified research is unambiguous that a biographical persona ("be Briggsy: calm,
color-blind") shifts an AI's *style*, not its *judgment* — fidelity comes from HIS actual
verdicts as calibration examples.

**Precedence.** This file encodes TONE taste only. `back-nine-design` remains the one canonical
home of correctness law (color encoding, honest charts, form behavior, CSP) and outranks this
file — a taste rule here never waives a correctness rule there. A real Briggsy read always
supersedes anything derived from this file.

**Maintenance law.**
- **Fold-in:** every new real Briggsy cold-read verdict gets appended to the exemplar bank
  (his verbatim words + the trigger + the resolution) in the same session it lands.
- **Staleness is event-keyed, not calendar-keyed:** the corpus is stale the moment a real
  Briggsy read exists that hasn't been folded in — check before every Caddie run.
- **Rotation:** if the exemplar bank grows past ~25 entries, drop redundant ones, keep the
  diverse set spanning great / luke-warm / rejected. Over-stuffed exemplar sets anchor a judge.
- **Pin per run:** a given cold read cites which exemplars/rules it used, so verdicts are
  reproducible. Never deal a random hand.

---

## The rules (each stated as a testable instruction to a reader)

### Copy (the "don't make users think" law — insight 069's seven hole shapes live here)

1. **Unquoted quantity.** Flag any sentence referencing a quantity (threshold, income,
   distance, base cost) without its dollar value in the same breath. "runs under the cliff",
   "that line", a bare "your income" — defect, not shorthand.
   *(Healthcare cold read 2026-07-03: 4 of the 7 holes were this shape. "Let's not force our
   users to think — just tell them.")*
2. **Endpoint-less delta.** Flag a distance/gap shown without BOTH endpoints riding alongside.
   "~$174,300 of room" alone fails; "~$43,700 income, line at ~$218,000, so ~$174,300 of room"
   passes.
3. **Mechanism-frame vocabulary.** Flag copy in the mechanism's frame instead of the
   household's: "per enrolled spouse" → "the two of you"; "marketplace help" → "the discount".
   Test: would a married couple who never read the tax code parse it on first pass?
   *("marketplace help" INVERTED for him — he asked whether conversions help with premiums.)*
4. **Unattributed derived figure.** Flag a modeled number presented as if the user entered it.
   A computed figure names its source ("the plan expects about ~$X"), never a bare "your income".
5. **Garden-path sentence.** Flag em-dash appositions and multi-fact sentences on load-bearing
   figures. Dollar sentences are subject–verb–number, one fact each.
6. **Era-naked twins.** Flag two same-named quantities with different values that don't each
   wear their era/definition — two bare "income" figures that disagree read as a data bug.
   *(He read exactly that as "test data issue?")*
7. **Certainty language.** Flag "guarantees", "no matter what", "unbreakable", "you're covered"
   in any verdict/projection copy. Probabilistic framing only (R12).
37. **Disclosures name the mechanism, never the reader's memory.** Flag any disclosure whose
    load-bearing referent is the reader's recall of their own intake ("the spending you
    entered", "you told us…"). Seeded/demo surfaces have no intake memory at all, and a real
    user doesn't recall field boundaries months later — the sentence must name WHO adds WHAT
    ("That's the only piece this tool adds by itself…"), with the reader's entry as supporting
    context at most.
    *(The Medicare residual bounced him THREE rounds, 2026-07-11: "stay in your own spending"
    → "who else's spending would it be?"; his own approved rewrite "come out of the spending
    you entered" → "I still don't get what this is trying to tell me. I entered these amounts
    in an expense section earlier?" — it landed only when the mechanism led.)*
38. **General terms require a details home.** A surface may speak a quantity in general terms
    ONLY if a details surface exists — or is filed — where the reader can see the dollars.
    Flag any generalized quantity with no detail home live or on the roadmap.
    *(His law, verbatim 2026-07-11: "We talk about numbers in general terms — which is fine as
    long as there is somewhere to see the details. So if that's still a pending feature set,
    then fine, we'll get to it. If not, Houston we had a problem.")*

### Tone

8. **Calm-but-wrong outranks everything.** An optimistic/rosier reading is WORSE than an
   alarming-but-honest one. A surface letting silence, a default, or a cheerful number
   overstate safety is flagged above every aesthetic issue. The cardinal rule.
9. **Relief-with-honesty is ONE stacked answer.** On a two-tier surface the harder/safer
   number (essentials floor) is subordinate — word + count only, never borrowing the full-track
   dollar that lets a scared reader stop at "we're golden".
   *(His clearance of the shipped stack: "reads good to me, honest relief, keep the stack.")*
10. **No alarm on the relief beat.** A security ritual or warning auto-firing onto the
    magic-moment verdict is alarm-after-calm whiplash — must be user-initiated and calm.
11. **Bad news reads as honest recalibration.** A worsening answer recalibrates calmly — never
    "just retire later", never a red gash or a dip that reads as blame. The ACA-cliff dip
    renders ABOVE the bar with a worded "doesn't hold", not a plot wound.
12. **No side quests.** A user-facing sub-task that matters must be grammatically in-flow and
    reward-forward — not bookkeeping copy behind a world-dimming modal.
    *(His live read: "why does it feel like a side quest?" → after copy-only fixes: "still a
    side quest" — "words on a whisper can't fix a whisper." De-modalized in-flow, he cleared it:
    "reads like a continuation.")*

### Trust

13. **Unpriced risk wears a disclosure + a capped grade.** Any cost the model can't yet price
    gets an on-surface disclosure AND a confidence cap — silence must never read as coverage.
    *(The $0-Medicare veto: the core retired demographic was silently inflated.)*
14. **Never fabricate authorship.** No knob/allocation/line the user didn't author. Modeled
    facts are disclosure rows ("on your behalf"), never editable knobs presented as their choice.
15. **No falsely-actionable verdicts.** A plan short from year 0 gets a figure-less "rethink"
    verdict — never a "trim the budget" clause implying a small fix suffices.
16. **Honest limits, plainly.** Self-custody/failure copy states the real limit ("without both,
    no one can recover this — not even us") and steers to the real remedy. Never "you're
    covered"; never "it's gone" when a file+word could still restore.
17. **Proven vs believed.** Reject absolute reliability claims and marketing voice about the
    product's own quality. A catchy tagline is a tell you're selling, not evaluating.

### Color (he is color-blind — assume full red-green deficiency)

18. **Never color alone.** Every meaning (safe/danger, cliff, over/under, verdict) carries a
    redundant non-color channel — shape, glyph, word, magnitude, position. WCAG AA contrast
    does NOT satisfy this.
19. **Describe what he should be seeing.** When presenting a screenshot, say what the reader
    should see — never assume the image speaks for itself to a color-blind reader.

### Layout & density (his real viewport: 1536×791 CSS px @ 2.5 DPR — never the 1871×917 screen number)

20. **Broken layout first.** Report clipping, overflow, off-frame elements, unreadable labels,
    untappable controls BEFORE any aesthetic critique. A P0 layout break outranks color theory.
    *(He caught a clipped title bar while Claude gave a color-theory critique.)*
21. **Dead whitespace = failure.** Every pixel earns its keep at the real viewport. Neutral
    emptiness is a defect, not "breathing room".
22. **Live regions reserve their box.** A live-updating region above interactive controls
    without a fixed min-height shifts tap targets mid-gesture (insight 035). Reward/relief copy
    stays OUT of role=status.
23. **Overflow spends whitespace, never disclosures.** When content overflows the one-frame
    fit, reclaim from neutral whitespace and density only. If scroll is unavoidable the honest
    order holds: graphs → disclaimer → doors. The reassuring verdict never sits in-frame while
    "this can be wrong" scrolls out of sight.
    *(His pick for the sanctioned casualty: "buttons drop below.")*
24. **Content cuts are product decisions.** Flag any deletion/fold/"summarize" done to make a
    surface fit. The infinite-space test: would you cut it if space were unlimited? If no,
    it's an aesthetics cut disguised as an edit — reject it.

### Chart grammar

36. **Every chart speaks one dialect.** Axis grammar, tick style, hover treatment, and clock
    units are product-wide, not per-chart: if the fan's x-axis is ages ("Today 66 / 65",
    "80 / 79"), every sibling chart's x-axis is ages; if the fan's y-axis rides the humane
    dollar ladder, every chart's does. Flag ANY chart whose dialect diverges from the fan —
    derive shared grammar from one canonical home, never a parallel loop that can drift.
    *(His U12 read, 2026-07-10: "The graph in the withdrawal order sub-panel should be
    consistent with the fanout. The x-axis should be ages. consistency." Same shape as his
    2026-07-08 station-2 read: "x and y axis with the same hover treatment we give the fan
    out." Consistency across charts is a STANDING expectation — check it on every chart-bearing
    surface.)*

### Motion

25. **CSP-legal motion only.** Verdict/transition animation is CSS class transform/opacity —
    no layout animation, no injected inline `<style>` (style-src 'self' blocks it; dev/preview
    don't apply prod headers, so a violation is green-local/red-prod).
26. **Feel-words mean a timing bug.** "Camera flash", "feels rushed", "blink" — instrument the
    timing before accepting any "it's just perception" theory.
    *(His "camera flash" was a GSAP bug clipping every beat to ~30% of designed duration.)*

### The WOW bar

27. **Water-beads self-check.** Would the most critical user say WOW — and does the "wow,
    Claude built this" awe disappear so the product stands on its own? Reacting to the autonomy
    instead of the product = bar missed.
28. **Never cut richness for a non-correctness reason.** When a simplicity instinct wants to
    cut visual richness, flag the CUT. Correctness concerns (bugs, races, perf) remain valid.
29. **Mobile shines, never survives.** Every surface gets a phone read as a peer to the laptop
    read. "This is a desktop showcase" is the bug.
30. **Feel outranks systems.** Comprehensive tests with weak presentation = fail. "Catch your
    breath" good is the bar; green counts nobody can see earn nothing.

### Process (how a verdict must be produced and presented)

31. **Never present unverified.** No "ready to go" without eyes on the real rendered output at
    the real viewport. If it wasn't visually verified, say so.
32. **The cold read is a gate, not a courtesy.** Tests cannot see comprehension holes by
    construction (069: 23 agents + 1,930 green tests missed 7 of them). Run the law-rubric
    audit (finders + render-context refuters) before spending the human read.
33. **Measure before fixing.** Before any layout/CSS fix: computed values in the FAILING
    environment, ONE fix, verify, stop. One "stop" from him means it already went too far.
34. **The taste oracle is N=1.** Flag any plan reaching for human panels, outside reviewers, or
    "Harry as a second reader" (Harry is AI). Escalate confidence Claude-side instead:
    instrumentation, adversarial panels, eval gates.
35. **Lead with one educated recommendation.** Present forks as ONE rec + reasoning, anchored
    in the prior decision, closing with a jargon-free one-breath go/no-go. Never a bare "A or
    B?", never a close that requires understanding a technical lever.
    *("I don't know what the fucking lever on the left does.")*
39. **Civilians read omission lists as bills.** Every "isn't counted" item invites "why not?
    I count my gas bill." A reader lens must interrogate each disclosed omission with "why
    isn't this just an expense like my others?" — and the surface (or a filed answer) must
    survive that question in the household's frame.
    *(His state-tax challenge, 2026-07-11: "We count car payments as an expense, food as an
    expense, why not state taxes?… An educated guess is worse than ignoring it?" — it spawned
    a full council + a filed engine unit; no Caddie lens had asked the question.)*

---

## Anti-patterns (things he has explicitly rejected — flag on sight)

- Color as the only signal for any state. WCAG AA contrast is not a substitute.
- A totals/readout line speaking "$0" over fields the user hasn't valued yet (one Add-a-line
  click → a three-line zero scoreboard). Totals wait for the first real number — a blank must
  never become a SPOKEN $0. *(His spend-step walk, 2026-07-11: "weirdness w/ 78k/year and
  0/year lines.")*
- Cutting/folding teaching or disclosure content to make a surface fit.
- Making the reader derive a number; a delta without both endpoints.
- Em-dash appositions / multi-fact sentences on load-bearing dollar figures.
- Mechanism-frame vocabulary to a household ("per enrolled spouse", "marketplace help").
- Certainty language ("guarantees", "no matter what", "unbreakable", "you're covered").
- The essentials FLOOR date presented as the fuck-off date; the easier number as the hero.
- Auto-firing a security ritual or warning onto magic-moment relief.
- A downturn encoded as a red gash / dip-below-the-line (reads as alarm or blame).
- A list-builder in a world-dimming modal behind a quiet whisper; fixing a whisper with words.
- "Try refreshing" / blaming cache as a diagnosis.
- A bare neutral "A or B?" menu; a go/no-go requiring a technical lever; empty "want to tweak?".
- Human perception panels of any kind — the oracle is N=1 Briggsy.
- Apologies / recovery theater / marketing voice about our own work.
- A synthetic placeholder masquerading as an entered value.
- Dumbing down vocabulary — use the right word + a quick inline gloss.
- Mobile scoped as "doesn't break".
- Fabricated authorship (proportional rescale, synthetic splits, a live second writer).
- "Trim the budget" on a plan short from year 0.
- A gauge/dial or smooth curve where a calm stepped readout is honest; plot riddles the reader
  must decode ("open dots above the line").
- Chaining visual changes without his eye between them; treating a plan doc as a build order.
- Guessing a layout fix without measuring the failing environment.
- "Done/shipped/good to go" without a seen outcome in the real environment.
- Green tests counted as success on a weak-presentation surface.
- Reward/directional copy inside role=status; a live region with no reserved box.
- A verdict shown before its honesty confirm resolves; an attestation displayed as
  "confirmed-fresh on DATE" (R19 laundering).
- Content retired as "redundant" when the real driver is the pixel budget.

---

## Vocabulary (so verdicts speak his language)

- **"so fucking slick that water beads off it"** — the named quality bar (UMB origin).
- **"WOW"** — the reaction the most critical user must have, at the product, not the autonomy.
- **"calm-but-wrong is the sin"** — the cardinal failure; rosier-than-true beats everything.
- **"the fuck-off date"** — the work-optional date (never the essentials floor date).
- **"why does it feel like a side quest?"** / **"still a side quest"** — bookkeeping copy +
  modal choreography; words can't fix a whisper.
- **"reads like a continuation"** — the pass condition for an in-flow sub-task.
- **"honest relief, keep the stack"** — approval of relief-with-honesty over dueling verdicts.
- **"no scroll, love it!"** / **"unnecessary scrolling on main page"** — the one-frame fit
  passing / failing.
- **"Let's not force our users to think — just tell them"** — the copy law.
- **"just for friends never softens the bar"** — honesty RISES for friends betting real money.
- **"catch your breath good"** — the presentation bar; opposite of "looks like shit".
- **"doesn't hold"** — the worded tell for a non-durable date, in place of a red gash.
- **"camera flash"** — motion clipped to a fraction of its designed duration.
- **"buttons drop below"** — the sanctioned below-fold casualty.
- **"reads good to me" / "wording is great" / "read is good to go"** — his clearances
  (often + "tweak later").
- **"fine — may revisit later"** — the luke-warm PARKED state (not a clear, not a fail).
- **"dead white space = failure"** — every pixel earns its keep.
- **"maybe it's the angle?"** — his instinct that beat three padding guesses (measure first).
- **"you fucked this up"** — direct callout, teammate register, not hostility. No apologies —
  plain accounting + the fix.
- **"a work of art"** — his mobile-shine anchor (the UMB how-to-play).
- **ATC / the pilot** — he directs the flight pattern; Claude owns every lever.

---

## Exemplar bank (trigger → his verbatim → resolution)

> The calibration set. Cite by number in a verdict card ("rhymes with E3"). Rotate past ~25.

- **E1 — the Healthcare sheet copy (2026-07-03).** Trigger: copy referencing quantities it never
  quoted ("the cliff", "the line", "runs ~$174,300 under it"). His read: nine rounds of
  confusion→fix in one night, "ok cool, makes sense now" → "ok love it, waaaaay better!"
  Resolution: the seven hole shapes + the copy law were minted; 1,930 green tests had seen
  nothing. **Direction of error feared: comprehension holes ship calm-but-wrong.**
- **E2 — the budget list-builder (2026-07-03).** Trigger: a spending list behind a modal with
  quiet copy. His read: "spending line by line — why does it feel like a side quest?" and after
  copy-only fixes, "still a side quest." Resolution: de-modalized in-flow; then "reads like a
  continuation." **Grammar/choreography defects can't be fixed with words.**
- **E3 — the two-tier hero (2026-07-02).** Trigger: essentials-floor vs full-track as competing
  headlines. His read of the shipped stack: "reads good to me, honest relief, keep the stack."
  **Relief-with-honesty = one stacked answer, harder number subordinate.**
- **E4 — the laptop frame (2026-07-08).** Trigger: U10/U11 grew the main page past one frame.
  His read: "unnecessary scrolling on main page." Resolution: density tier, protected verdict/
  band/disclaimer, doors the only casualty — then "no scroll, love it!"
- **E5 — the duplicate pay question.** Trigger: intake asked pay + investment income as two
  fields. His read: flagged as confusing — collapsed to ONE field, REVERSING a council call.
  **His comprehension signal outranks the council on tone.**
- **E6 — the side-rail layout.** Trigger: the answer in a side rail. His read: "makes it feel
  unimportant" → centered stage. A 3-column spread: "newspaper without the flow" — killed.
- **E7 — the survivor fold.** Trigger: the survivor readout fold. His read: "fine — may revisit
  later." **The luke-warm PARKED state exists; not every read clears or fails.**
- **E8 — the two-pane first frame.** Trigger: both panes landing at once. His read: "calm, not
  an ambush — ship." **The reveal choreography is part of the tone.**
- **E9 — the "Not now" button (2026-07-03).** Trigger: a decline CTA labeled "Not now". His
  read renamed it "Cancel" for honesty — prior N=1 outranks council on tone.
- **E10 — the ?vault re-plant clobber.** Trigger: a dev-seam refresh silently clobbering a
  saved edit. Caught live by him — the class of defect only a real walk sees.
- **E11 — the U12 batch read (2026-07-10, the Caddie's first scored prediction).** His full
  verbatim: "I think everything is fine. The graph in the withdrawal order sub-panel should be
  consistent with the fanout. The x-axis should be ages. consistency. other than that good to
  go." Two calibration lessons: (a) **consistency-across-charts is his standing lens** — he
  walked past the readers' two hard flags (the $7,300 trim figure, the $530 room) without
  comment but stopped on a chart speaking a different axis dialect than the fan (→ rule 36);
  (b) **he free-walks the doors** — the finding sat on a surface the Caddie's walk never
  captured. A cold read that skips the door sheets is not the read he performs.
- **E12 — the phone fan interaction (2026-07-10, live from his phone mid-U13-walk).** Trigger:
  touch users had to tap-to-enlarge before scrubbing, and the "enlarged" modal renders the
  fixed-aspect chart SMALLER than the inline band on a portrait phone. His verbatim: "glide
  works, but let's not force the click to 'enlarge' it — I think the 'enlarged' popup is
  actually smaller, lol." Resolution: pointer-adaptive chrome — coarse pointers get direct
  drag-scrub on the inline band (touch-action pan-y; vertical swipe stays page scroll) and NO
  enlarge affordance; fine pointers keep the genuinely-bigger lightbox. Two lessons: (a) **an
  affordance must deliver its name** — "enlarge" that renders smaller is a phantom affordance
  (the 2026-06-29 hover-kill class), and he catches it by FEEL on the device, with a laugh not
  anger; (b) **direct manipulation beats a hop** — never route a touch reader through a modal
  for a value the surface itself could give under their finger.
- **E13 — the Medicare residual, three rounds live (2026-07-11).** Trigger: the priced-Medicare
  residual's ownership clause. Round 1: "stay in your own spending" — "what does it mean…
  who else's spending would it be?" Round 2 (his own chat-approved rewrite, re-read on the
  surface): "come out of the spending you entered" — "I still don't get what this is trying
  to tell me. I entered these amounts in an expense section earlier?" Round 3 landed: the
  mechanism-naming lead ("That's the only piece this tool adds by itself."). Then the
  generalization: "why don't we just ask for it?… correctness always out rules everything" →
  the ask-for-Medicare-extras question + the state-tax council + a filed engine unit. Three
  lessons: (a) rule 37 — his approval of a rewrite IN CHAT does not survive his re-read ON
  THE SURFACE; only the surface read counts; (b) a Caddie panel graded this exact clause as
  trust-building ("it hedges honestly") — civilian ownership-mechanics are a distinct failure
  axis from tone (the FALSE-PASS that minted rules 37/39); (c) his comprehension questions
  are PRODUCT signals, not copy nits — two engine-unit filings came out of one paragraph.
