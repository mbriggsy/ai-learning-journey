# Gauntlet Scoring Rubric

Score each criterion 1-10. Weight them to produce a composite score.

## 1. Game Feel (35%)

Does this feel like you're at a game table with friends? Warm, playful, high-stakes moments dramatic, quiet moments cozy.

**10:** The screen makes you lean forward. You feel the tension of a draw, the relief of a Defuse, the chaos of an Attack chain. The UI disappears and you're just playing.
**7:** It works. Turn transitions are clear, actions feel responsive. But it could be any card game.
**4:** Functional but sterile. Clinical spacing, no personality, no tension arc.
**1:** Confusing. You can't tell whose turn it is or what just happened.

Red flags: void/empty space with no purpose, static screens during high-tension moments, no visual difference between "safe" and "about to explode."

## 2. Distinctiveness (30%)

Would you know this is BURNED from a screenshot? Custom decisions vs. template defaults.

**10:** Unmistakable. The spy agency, the mid-century modern aesthetic, the comedy — it's in every pixel. You'd recognize it across a room.
**7:** Some personality. Custom icons, thoughtful color. But generic bones.
**4:** Could be any card game. White rectangles, default spacing, no thematic art.
**1:** AI slop. Purple gradients, white cards, stock patterns.

Red flags: cards with no color/art, generic crosshatch patterns, no illustration or mascot, "any card game" aesthetic.

## 3. Craft (20%)

Typography hierarchy, spacing consistency, color harmony, contrast ratios, animation polish, touch targets.

**10:** Museum quality. Every pixel is intentional. Spacing is rhythmic. Type hierarchy is crystal clear. Animations are butter.
**7:** Clean and professional. Minor inconsistencies but nothing breaks.
**4:** Rough edges. Truncated text, misaligned elements, jarring transitions.
**1:** Broken fundamentals. Overlapping text, invisible buttons, no hierarchy.

Red flags: text truncation, visible scrollbars, inconsistent border-radius, animation jank, contrast failures.

## 4. Clarity (15%)

Can a first-time player figure out what to do? Card effects obvious? Turn state clear? Button purposes unmistakable?

**10:** Zero learning curve. Every element communicates its purpose. A player who's never seen the game can play within 30 seconds.
**7:** Clear for experienced players, minor confusion for newcomers.
**4:** Requires explanation. Important state is hidden or ambiguous.
**1:** Actively misleading. Buttons do unexpected things, state is invisible.

Red flags: no indication of whose turn it is, card effects unclear, draw pile count invisible, no scroll affordance for hidden content.

## Composite Score

`(game_feel * 0.35) + (distinctiveness * 0.30) + (craft * 0.20) + (clarity * 0.15)`

## Score Interpretation

- **9-10:** Ship it. Water beads off this.
- **7-8:** Strong. Polish pass needed.
- **5-6:** Functional but generic. Needs identity and energy.
- **3-4:** Below baseline. Structural problems.
- **1-2:** Broken. Start over.
