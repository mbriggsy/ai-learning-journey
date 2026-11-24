---
title: "RightCapital UI reference: the build sheet for B9's clone"
doc-type: research
status: current (synthesis of six research lanes, 2026-11-24)
created: 2026-11-24
derives-from: [docs/plans/rightcapital-map.md, docs/product.md]
sources: [the six lane reports and their screenshots, listed under "Where this comes from"]
---

# RightCapital UI reference: the build sheet for B9's clone

**The ruling this serves (Briggsy, 2026-11-24).** B9's UI becomes a RightCapital clone: their screens, layout,
navigation, flow, chart types and interaction, copied on purpose. Only their logo, name and artwork are not lifted. The
engine stays; the UI is rebuilt. His words the same night: "Why do we keep persisting what we have when we've decided we
need a RightCapital clone from a UI perspective? And everytime we talk about RightCaptial you insist on not copying it,
but why not??? If it works, wtf?" This supersedes the map's line "nothing is copied from RightCapital's screens, names
or text" for the UI (`docs/plans/rightcapital-map.md`); the map's feature rows, its out-of-scope list and its gap order
still stand.

**How to use this doc.** Every B9 UI builder works from it. Section 2 is one section per screen: build what it says,
open the named screenshots when a detail is unclear. Section 3 is the token sheet. Section 6 says what the engine
already gives each screen and what is missing. The words on B9's screens still come from `src/ui/copy.ts` (plain words,
"X of 10", `~$X`); this doc copies RightCapital's structure, not its sentences.

**This repo is public.** No RightCapital image is copied into it, and none of their text is pasted here. The screenshots
live outside the repo, in

`C:/Users/brigg/.claude/projects/C--users-brigg-ai-learning-journey-projects-the-back-nine/b9-ui-research/`

with one folder per lane: `rc-shell/`, `rc-analysis/`, `rc-cashflow-tax/`, `diy/`, `advisor/`. File names below are
relative to that folder. Open them with the Read tool, which shows images.

---

## 0. The short version

1. **Two bars across the top, no sidebar.** A white bar with the household's names stacked at the left and the module
   words in a row (Dashboard, Investment, Retirement, Tax, Profile for B9), then a gear. Under it, a warm grey bar
   (`#f0ede8`) with the module's sub-tabs, the active one underlined in blue.
2. **One page frame for nearly every screen.** A big plum-grey title, one line of plain text under it, folder tabs on the
   right edge sitting on one white bordered panel, and inside the panel a chart (about 70% of the width) beside a column
   that states the key number in a sentence (about 30%). A small outlined **ACTION ITEMS** tab sits on the panel's bottom
   edge and opens the what-if tray under it.
3. **The what-if is a two-column tray**: "this plan" with sliders and boxes on the left of each row, the plan it is
   compared against as plain text on the right. Nothing recomputes until **Refresh**. Changed values turn blue.
4. **Data entry is cards and a right-side drawer.** A 4-column grid of cards with a plum header band; click one, a drawer
   slides in from the right with a two-column form and Delete / Cancel / Save.
5. **The year-by-year table is the Cash Flows page**: grouped headers (money in, money out), underlined headers you
   click to drill in, a breadcrumb back up.
6. **Tax Strategies is B9's recommendation screen**: grouped bars (proposed vs reference) with the "results in $X less
   tax" column, bracket lines over taxable income, and a ranked "top strategies" table.
7. **Look: warm, flat, roomy.** Stone greys, one aubergine (`#5c4c64`) for titles and header bands, one blue
   (`#5070e6`) for every action, square panels, almost no shadows. Their font (Roobert) is licensed; B9 uses
   **Figtree**.
8. **B9 changes three things on purpose**, and only these: every coloured series gets a second cue (Briggsy is
   colour-blind; several RightCapital pairs measurably merge, section 3.4); the honesty RightCapital skips is kept (the
   fan shows the run-out share and thins as couples die; the ring reads "X of 10", never "98%"); and B9's own answers
   (the work-optional date, the survivor and essentials readings, the graded recommendation) get homes in RightCapital's
   frames.
9. **Stack:** Tailwind CSS v4 + shadcn/ui on Base UI + Highcharts in styled mode + TanStack Table + lucide icons. It is
   RightCapital's own stack (read from their shipped CSS) and it runs under B9's CSP unchanged with three day-one fixes.
10. **Impeccable: do not install it.** No new design skill is needed. The reference screenshots are the design.

### Decisions this doc makes, so builders do not reopen them

- **The guided setup becomes RightCapital's six-step chevron stepper of cards.** The 2026-11-22 ruling kept "B9's
  setup as the profile entry"; the 2026-11-24 ruling copies RightCapital's flow. The stepper is a guided setup, in
  their form: the substance (step by step, defaults pre-made) survives, the one-question screens go. The intake logic
  under the screens (`src/intake/intakeMap.ts`, `sanity.ts`, `whatIf.ts` and the rest of the `.ts` files) stays.
- **B9's headline in the ring is "X of 10", not a percent.** The engine emits an integer 0 to 10 with a 9 cap
  (`Headline.xOfTen` in `src/shared/model.ts`); a "98%" would print precision the engine deliberately throws away. The
  ring's arc fills to X/10, the caption is the outcome word. The look is RightCapital's; the number is B9's.
- **Explicit Refresh stays.** B9's final-tier runs are 16,000 futures; recomputing on every slider move would thrash.
- **Motion follows B9's law, not RightCapital's replay.** RightCapital drops bars to zero and regrows them on every
  Refresh. B9 morphs from the old value to the new one, keeps numbers static (no count-up), and honours reduced motion
  (`back-nine-design`). The fade-to-40%-with-"Loading…" state is copied as is.
- **The phone gets the same screens, stacked**, not a separate companion app (section 2.21).
- **Out, per the map's 2026-11-09 rulings:** Insurance, Education, Estate, Budget, Tasks, Liquidity, the document Vault,
  Tax Analyzer's uploaded returns, the Iris assistant, the chat button, the advisor portal, account linking. The top bar
  keeps RightCapital's order so any of them can slot back in.

---

## 1. RightCapital's information architecture

### 1.1 The nav tree (RightCapital's full product)

| Top-bar word | Sub-tabs (second bar) | Folder tabs on the page's panel |
|---|---|---|
| Dashboard | Snapshot · Balance Sheet · Liquidity · Budget · Tasks | Balance Sheet: Current · Details · Historical. Budget: Summary · Activity · Transactions · Budget |
| Investment | Asset Allocation · Allocation Path · Risk · Sector and Style · Concentration · Tax Allocation · Holdings | Asset Allocation: Summary · Detail. Risk: Analysis · Details |
| Retirement | Analysis · Stress Test · Social Security · Health Care (called Medicare before late 2026) · Cash Flows | Analysis: Probability · Confidence · Comparisons · Savings · Retirement Details. Social Security: Comparison · Summary. Health Care: Cost Analysis · Medicare Options · Preferences. Cash Flows: Maps · Summary · Net Worth · Invested Asset · Accounts (· Options) |
| Insurance | Life · Disability · Long-Term Care · Property and Casualty | per spouse tabs |
| Education | one tab per student · Details | |
| Tax | Tax Estimate · Tax Strategies · Tax Analyzer | Tax Estimate: Estimate · Details. Tax Strategies: Summary · Calibration · Comparison · Details · Strategies. Tax Analyzer: Summary · Comparison · Thresholds · Details · Uploaded Returns |
| Estate | Checklist · Beneficiary · Estate Analysis | Flow · Comparison · Details · Trust |
| Profile | Net Worth · Goals · Income · Savings · Expenses · Family · Blueprint | Blueprint: Net Worth · Goals · Income, Savings, Expenses |
| `•••` More | Debt · Student Loan · Stock Plans · Business · Calculator · Notes | |
| folder icon | Vault (Shared Folder · Private Folder) | |
| sparkle icon | Iris AI assistant (2026) | |
| gear | Methodology · Return Assumptions · Account Assumptions · Tax Assumptions · Other Assumptions · Budget Categories | |

Sources: `rc-shell/planoverview-01/03/05/10/11`, `rc-cashflow-tax/help-*`, the help center's module overview articles.

### 1.2 B9's nav (the clone, in RightCapital's order)

| Top-bar word | B9 sub-tabs now | Added later, as their gap lands |
|---|---|---|
| Dashboard | Snapshot (the home) · Balance Sheet | |
| Investment | Asset Allocation · Tax Allocation | Allocation Path (a mix over time) · Holdings (U20) |
| Retirement | Analysis · Health Care · Cash Flows | Stress Test (map gap 8) · Social Security (map gap 7), each in RightCapital's slot |
| Tax | Tax Strategies | Tax Estimate (map gap 10) |
| Profile | Net Worth · Goals · Income · Savings · Expenses · Family · Blueprint | |
| right side | a lock icon where RightCapital's folder sits (B9's encrypted save: save, lock, backup) · gear (assumptions) | |

A tab is shown only when its screen exists; never a dead tab. Out-of-scope modules (1.3's list) never appear.

### 1.3 The flow from empty to a finished plan

1. **New plan.** RightCapital asks for the two names (and optional emails) and starts. B9 asks for the two names and
   goes straight to the stepper.
2. **The stepper** (no module nav yet, only logo, names and gear): six chevron steps, Family → Income → Savings → Net
   Worth → Expenses → Goals, each a page of pre-made cards (a salary and a Social Security card for each person, a
   401(k) for each, living expenses, tax and fees, retirement age, retirement expense, health cost, LTC cost). Most
   entry is "click a card, type one number, Save". Previous / Next at the bottom right; the last step's button is
   Complete. (`rc-shell/dataentry-03` to `-09`.)
3. **The workspace opens** on the Dashboard's Snapshot, a page of cards: the success ring, net worth, a balance sheet,
   the fan chart, recommendations. Each card's "open" arrow jumps to its module.
4. **Retirement → Analysis**: the plan's odds beside a proposal's. The user opens ACTION ITEMS, moves levers, presses
   Refresh, compares. Proposals are kept by name in a plan list.
5. **Deeper tabs** answer the follow-ups: the fan (Confidence), the plan against the proposal over time (Comparisons),
   income sources and withdrawal rate (Retirement Details), the year-by-year table (Cash Flows), taxes and Roth
   conversions (Tax Strategies), Social Security timing, health costs, stress tests.
6. **Profile** stays the place to change facts; every card and Blueprint tile opens the same drawer. A fact change
   marks results out of date until Refresh.
7. **The finished plan** is the proposal the household adopts: a tax proposal is pushed into the Analysis through the
   Action Items "Tax strategy" row; in B9 the recommendation's Apply does the same (the saved recommendation,
   `src/store/savedRecommendation.ts`).

---

## 2. Every screen B9 clones

### 2.0 The shared parts (build these once; every screen is made of them)

**Top bar.** White, about 50 px tall at 1x (100 px in 2x captures). Left: the B9 wordmark (ours, never theirs), then the
two names stacked in two lines of small regular text; that block is the only "whose plan" cue. Centre-right: the module
words, about 15 px, warm dark grey, slightly letter-spaced. The active module gets a `#f0ede8` block behind its word that
runs the full bar height and joins the sub-nav below, so it reads as a tab. Right: icons (lock, gear), plum filled.
Screens: `rc-shell/planoverview-05.gif` (2026 shell), `rc-cashflow-tax/help-retirement-cash-flows-summary-tab-cash-flows-51.png`.

**Sub-nav bar.** Full width, `#f0ede8`, about 48 to 60 px. The module's pages as centred text links, about 18 px. The
active link is darker with a 3 px blue (`#5070e6`) underline. Same screens.

**Page head.** Title about 40 to 44 px, regular or light weight, aubergine (`#5c4c64` to `#4b4256`). Some titles carry a
small icon after them (an expand-to-full-screen arrow pair; an eye for "preview"). Under the title, one or two lines of
body text (about 18 px, `#57534e`). In RightCapital that line is a generic explanation; **in B9 it carries the screen's
answer in a plain sentence** (on Analysis, the calm answer; elsewhere, the screen's question and its one-line answer,
the Income Lab pattern in 4).

**The folder-tab panel.** A white panel, 1 px `#d8d2c8` border, square corners, no shadow, inner padding about 48 to 60
px. Folder tabs sit on top of its right edge: inactive ones filled `#f0ede8` with body text, the active one white with
a border on three sides that opens into the panel. Tab labels about 16 px. One panel per page, never a grid of panels.
Screens: `rc-analysis/probability-tab-retirement-analysis__cleanshot-2024-07-26-at-17-10-07-2x.png`,
`rc-cashflow-tax/help-tax-tax-strategies-roth-conversion-strategy-51.png`.

**The chart card grammar** (inside the panel, on nearly every view):
- A centred chart title, about 22 px aubergine, often followed by a **chevron**: the title is a menu that switches
  between the 2 to 6 charts this tab holds ("Summary of tax strategy ⌄", "Income sources of Proposed plan ⌄").
- **Pickers at the top right**: square white selects with a 1 px grey border and a chevron (the plan, a return scenario,
  a person, a year). Two pickers with "vs" between them where the chart compares two choices.
- **The chart on the left, about 70% of the width.** Faint horizontal gridlines only, no vertical grid, no chart border.
  Money axis labels abbreviated (`$2.5mm`, `$500k`, `$0`), about 12 px grey. Age on the x-axis by default, both spouses'
  ages where a single year is labelled ("61/61").
- **The key-metric column on the right, about 30%**: centred text, an aubergine lead-in, one big near-black number
  (about 30 px), an aubergine tail ("Proposed strategy results in / **$289,016 less** / taxes paid"), stacked two or
  three times. This is how every chart becomes one plain sentence.
- **Legend under the chart**: dot markers (lines get a short dash), centred. Each item toggles its series; hovering one
  dims the others; hiding a series rescales the y-axis.
- **Tooltip**: a white card, 1 px border, soft shadow, bold header (the age or year), then a row per series with its dot,
  the label in regular weight and the value in bold. A vertical grey crosshair on time charts.
- **"Future dollars ⚙"** at the panel's lower right on value charts: it opens the Display settings drawer (2.21).
- **ACTION ITEMS**: a small outlined button with uppercase blue text and a thick (about 6 px) blue bar along its bottom,
  centred on the panel's bottom border, so it reads as the handle of a tray below. On screens with detail tables it
  reads DETAILS instead.

**The Action Items tray.** Opens under the panel (the page grows downward) on `#f6f4f1`. Full description in 2.8; Stress
Test, Health Care and Tax Strategies reuse it with their own rows. Footer at the right: `⟳ Reset` (text link) · `Edit`
(outlined blue) · `Refresh` (solid blue). A grey speech-bubble "Notes" link at the far left.

**The right drawer** (every editor). Docked right, full height, about 42 to 50% of the window, white, over a light grey
scrim (the page stays visible, dimmed about 40%). Header: an aubergine band about 56 px with a white line icon, the title,
a thin divider and an X; record editors (Loan) add up/down chevrons to step to the previous/next item without closing.
Body: two columns of label-over-input fields, about 24 px between rows; fields that belong together sit side by side
(Income starts / Income ends); a thin rule between groups; a short explanatory paragraph where a number needs care;
computed values shown as plain text, not inputs ("Minimum payment $2,387"). Bottom: a "Notes" link, then a `#f0ede8`
footer with a red Delete at the left and grey Cancel and blue Save at the right. Screen:
`rc-shell/vimeo-income_add-a-salary.jpg`, `rc-shell/vimeo-net-worth_loans_enter-a-mortgage.jpg`.

**Inputs.** White, 1 px `#d8d2c8` border, 2 to 4 px radius, label above in body text, `$` prefix inside money fields,
`%` suffix right-aligned in percent fields, small filled grey "i" dots after labels that need a word of help. Read-only
fields filled `#f0ede8`. RightCapital's dropdowns are native selects (their menus render as the OS list); B9 uses Base UI
Select styled the same way.

**Buttons.** Primary: solid blue rectangle, white text, 2 to 3 px radius, a `>` chevron after the label when it opens a
menu ("Add Account >"). Secondary: white with a 1 px blue border and blue text. Destructive: coral fill, white text.
Neutral: warm grey fill (`#a9a4a0`), white text. Add-menus are **solid blue panels with white text and flyout
sub-menus** (`rc-shell/bp-networth-22.png`), very recognizable; copy them.

**Tables.** A 2 px aubergine rule across the top; an optional group-header row on `#e6e2dc` ("Cash Inflows" over its
columns); a column-header row on `#f0ede8` with right-aligned labels that wrap to two lines; **underlined headers are
clickable and drill in**. Body rows about 32 to 36 px at 1x, numbers right-aligned with thousands separators and no `$`,
negatives in parentheses, very faint zebra (white / `#fbf9f7`). Year and Age ("61/61") lead every row. A square
outlined blue **download** button (down-arrow-into-tray icon) beside every table. Long tables page at the bottom right
(‹ [1] › and "All / page"). Screen: `rc-cashflow-tax/help-retirement-cash-flows-summary-tab-cash-flows-51.png`.

**Loading state.** No spinner and no skeleton. The old chart fades to about 40% opacity with a small grey "Loading…"
over the number or inside the bar; then the new values come in. Screens: `rc-analysis/FRAME_probability-refresh-loading-state.png`,
`rc-analysis/FRAME_stress-test-loading-after-refresh.png`, `rc-cashflow-tax/help-investment-asset-allocation-52-later.png`.
A long solve shows a bold centred sentence and "◯ Calculating" (`rc-cashflow-tax/help-tax-tax-strategies-strategies-tab-51-later.png`).

**Stale state.** After a data edit RightCapital asks the user to recalculate. B9 keeps the last result visible, marks it
out of date with a one-line banner naming what changed and when the result was made (Pralana's "last run" stamp), and
waits for Refresh. `src/ui/stalenessExposure.ts` and `src/store/staleness.ts` already compute what is stale.

**Empty state.** A blank right pane with only its header strip (`rc-shell/form-card-01.png`), or a bold centred sentence
and one blue button with a hand-drawn arrow pointing at it (Tax Strategies before its first solve,
`rc-cashflow-tax/help-tax-tax-strategies-strategies-tab-01.png`). B9 adds TPAW's rule: say what the screen is waiting for.

### 2.1 Dashboard → Snapshot (the home)

Screens: `rc-shell/planoverview-03.png`, `rc-shell/advnext-12.gif`, `rc-shell/snap-custom-01.png`, `rc-shell/snap-dashitems-02.png`.

- **Layout.** Title "Snapshot" with an eye icon; blue "Add Item >" at the top right. A two-column masonry of white cards,
  12 px radius, 1 px `#d8d2c8` border, no shadow, 24 px gaps. Left column about 48% wide; the right column has two small
  square cards on top, then wide cards.
- **Cards seen**:
  - *Probability of success*: bold card title top left, a thick ring about 300 px across, the arc a gradient from blue
    (`#5070e6`, top) to teal-green (`#56a58c`, bottom), the rest light grey (`#ececec`); a very large bold number in
    the centre with the caption under it.
  - *Small stat rings*: a ring of short radial dashes (a tick dial) in two blues (`#5070e6` into `#5ebaf3`), a bold
    value and a caption ("Net worth", "Effective federal tax rate", "Withdrawal rate").
  - *Balance Sheet*: label / value rows, values right-aligned with `$`, a divider between assets and debts.
  - *Net worth as of a date*: three bars, Assets (green), Liabilities (coral), Net worth (blue).
  - *Asset simulation results*: the fan chart (2.9) at card size.
  - *Recommendations*: free text with dash bullets.
- **Controls.** On hover a card shows a six-dot drag handle top left, an "Open Item" arrow-in-box and an X top right.
  Open Item jumps to the module (the ring opens Retirement → Analysis). "Add Item" picks which cards show.
- **B9's version.** The ring card holds the plan's "X of 10" with its outcome word (and, for a working household, the
  work-optional date as a line above the ring). Small rings: net worth (entered balances), withdrawal rate in the first
  retired year, lifetime tax. A Recommendations card holds the solver's winner in one sentence with Apply / See the
  others (the Winner card pattern, 4.1). The fan card. A balance sheet card. B9 does not need "Add Item" or drag in the
  first build: a fixed set, in this order.

### 2.2 Dashboard → Balance Sheet

Screens: `rc-shell/balsheet-01.png`, `balsheet-02.png`, `balsheet-03.png`.

- Folder tabs Current · Details · Historical. Current: a centred sentence ("Your net worth is **$X** as of [date]") and
  three wide flat bars (Assets green, Liabilities coral, Net worth blue); DETAILS pull tab. Details: accounts by
  category and owner. Historical: net worth over time (needs history B9 does not keep; leave the tab out).
- **B9 cue:** the bars carry their names on the axis and their values printed on the bar; liabilities sit as a separate
  bar with the value in parentheses, never told apart by colour alone (green vs coral merges under deuteranopia, 3.4).

### 2.3 Profile: the first-run stepper

Screens: `rc-shell/dataentry-03.png` to `dataentry-09.png`, `rc-shell/vimeo-family_choose-a-resident-state.jpg`.

- **Layout.** No module nav: logo, stacked names, gear. Below white space, a full-width **chevron stepper**: six
  arrow-shaped segments "① Family ② Income ③ Savings ④ Net Worth ⑤ Expenses ⑥ Goals". Done and current segments fill
  aubergine with white text; future ones are white with grey text and a thin grey outline; numbers sit in small outlined
  circles.
- Under it: "Step 2 – Salary and other Income" (about 34 px aubergine) and a short instruction paragraph addressed to
  the household. A blue "Add Income >" button right-aligned above a **4-column card grid** (2.4). "Previous" and "Next"
  outlined buttons at the bottom right (Previous from step 2); step 6 ends with "Complete".
- **B9's version.** The same six steps. B9's intake questions map onto the cards: Family (two people, birth years, sex,
  state), Income (pay, Social Security statement figure and claim age, pensions and other income), Savings (deposits
  per account, match, HSA), Net Worth (accounts by kind and owner, each with its stock/bond/cash mix), Expenses (one
  figure or the itemized budget), Goals (stop date per person or the date search, the goal choice, health choices).
  Pre-make the cards RightCapital pre-makes where B9 has the field. B9's validation (`src/intake/sanity.ts`) shows in the
  drawer under its field, not as a separate screen.

### 2.4 Profile: the section card grids (Family, Income, Savings, Expenses, Goals)

Screens: `rc-shell/dataentry-05.png`, `profile-03/05/07.png`, `form-401k-01.png`, `form-retexp-02.png`.

- **Card anatomy.** About 300 px wide at a 1440 window, 24 px gutters, 4 columns. A header band about 27% of the card,
  solid aubergine: a large white line icon at the left, the type label right-aligned in white UPPERCASE semibold
  ("SALARY", "SOCIAL SECURITY", "401(K)", "ROTH IRA", "LIVING EXPENSES", "RETIREMENT"). Family cards have no icon
  ("CLIENT", "CO-CLIENT", "CHILD"). Body `#f6f4f1`: the item's name at the top ("John's Salary"), then one or two
  label / value lines pinned to the bottom ("Annual amount $100,000", "Monthly amount Estimated", "Already receiving
  [checkbox]").
- Hover shows a small round X at the top right to delete. While a drawer is open, the selected card's band darkens
  (`#3d3344`) and the rest fade.
- After setup the same grids live under Profile's sub-tabs, with the section name as the page title and the blue
  "Add … >" button at the top right; no stepper.
- **Drawer field lists** (what each card opens; B9 shows only fields the engine reads, D7):
  - Salary: name, annual amount, owner, starts, ends, yearly raise, exclude from SS tax. (B9 today: one flat pay figure
    to the stop date; raises are map gap 12.)
  - Social Security: already receiving; filing age and month; estimate method (simple estimate / statement value /
    earnings history / none). B9: the statement figure and claim age per person.
  - Pension: name, amount, owner, starts, type (certain / life / certain-life) with guaranteed period and survivor %,
    yearly increase and its type, cost basis, exclusion ratio, state-tax exempt. B9 has start and end age, raise rule,
    taxable share, survivor share (R40).
  - 401(k) and other savings: name, contribution ($, % or Max), owner, target, starts, ends, employer match tiers, %
    of match to Roth, escalation.
  - Retirement expense: monthly amount, simple or a detailed worksheet (two columns of category amounts with "Copy from
    >"), spending style.
  - Retirement age: one box per spouse side by side.
  - Tax and fees: filing status, local tax, fees.

### 2.5 Profile → Net Worth (master-detail)

Screens: `rc-shell/planoverview-01.png`, `profile-02.png`, `form-card-01.png`, `bp-networth-22.png`.

- Title "Net Worth"; at the top right a solid blue "Add Account >" (RightCapital also has "+ Link Account"; B9 has no
  account linking, so it is left out).
- **Left column (about 35%)**: an aubergine band "Total Net Worth  $X" in bold white, then rows on `#f6f4f1`, each with a
  large outline icon, a name and a right-aligned total: Bank, Card, Investment, Loan (negative in parentheses), Property,
  Other. The selected row gets a 4 px blue left edge and a slightly darker fill.
- **Right column**: a header strip on `#f0ede8` with the category icon and "Investment: $735,000" in bold, then account
  rows (name about 20 px, account kind under it in grey, balance right-aligned). Click a row to open its drawer.
- **Empty state**: the right side shows only its header strip ("Insurance: $0") and blank space.
- **Add menu**: the blue flyout panel (Bank, Card, Investment, Loan, Property ›, Other).
- **B9's rows today**: Investment (taxable, pre-tax, Roth, HSA per person). Bank, Loan and Property are map gaps (bank
  accounts U10, debts with a fixed payment that ends, property only if a sale is planned); show a category row only when
  B9 can hold that kind.

### 2.6 Profile → Blueprint

Screens: `rc-shell/site-blueprint-net-worth.png` (cleanest), `planoverview-02.png`, `kbbp-networth-02.png`,
`kbbp-goals-01.png`, `site-blueprint-goals.png`, `kbbp-ise-01.png`.

- Folder tabs Net Worth · Goals · Income, Savings, Expenses, on one panel. Top left: a legend of short thick coloured
  dashes with labels. Top centre: a `#f0ede8` box with the headline ("Net Worth: $4,327,564"). Top right: "Edit"
  (outlined; a checklist to hide or show items) and "Add >" (blue, the same Add menus as Profile). Every tile opens the
  same drawer as its Profile card.
- **Net Worth tab.** Two aubergine person icons side by side with name and age under each. From a small open circle
  beside each person, a 2 px aubergine line runs out and curves down with an arrowhead to that person's column; under the
  couple a bracket labelled "Jointly Held" drops an arrow to the middle column. Three columns of tiles (his, joint,
  hers), each tile about 360 × 90 px: a 4 px coloured left bar, a pale tint of the same colour as fill, the name centred,
  the balance bold under it. Debts in parentheses.
- **Goals tab.** A dotted vertical spine; at each goal year the year in bold and both ages on the spine; chevron-shaped
  goal tiles pointing at the spine, alternating left and right, each with a coloured edge, pale tint, UPPERCASE
  category, the goal's name and a line icon.
- **Income, Savings, Expenses tab.** A swim-lane grid: rows Income / Savings / Expenses labelled vertically at the far
  left, columns him / Joint / her under person icons, the same tiles.
- **B9 cue:** every tile also prints its category word in small caps above its name (the colour bar alone fails for
  green vs coral, 3.4). B9's data: accounts per person (joint taxable where entered), income and deposits per person,
  budget lines, stop dates, claim ages.

### 2.7 Retirement → Analysis → Probability (B9's headline screen)

Screens: `rc-analysis/probability-tab-retirement-analysis__cleanshot-2024-07-26-at-17-10-07-2x.png`,
`rc-shell/planoverview-05.gif` (2026 version with plan pickers), `rc-analysis/FRAME_plan-picker-dropdown-above-gauge.png`,
`rc-analysis/FRAME_probability-refresh-loading-state.png`, `rc-analysis/FRAME_display-settings-drawer.png`.

- **Layout.** Two equal halves inside the panel. **Left: the plan being edited** (a plan picker above it, "Proposed plan
  ▾"). **Right: the plan it is compared against** (a picker, then a pencil-in-box icon that opens the plan list, 2.8).
- **Each half**: a ring gauge about 300 px (2.1's ring: thick, blue-to-green gradient, unfilled arc light grey, a huge
  black number in the centre, a caption under it in aubergine) beside a **single bar** of median ending invested assets
  (one green `#56a58c` bar, its value printed inside in white with a dark text shadow, gridlines `$0 / $2.5mm / $5mm /
  $7.5mm`). The two halves have separate y-scales unless the display setting forces one scale.
- **No zones.** RightCapital's ring has no red, amber or green bands and no threshold mark at any value. B9 keeps that.
- "Future dollars ⚙" at the lower right; ACTION ITEMS centred on the bottom edge.
- **Loading**: both rings and bars fade to about 40% with "Loading…" over the number and in the bar; then the arc and the
  bar morph to the new values.
- **B9's version.**
  - The page's intro line is B9's calm answer: for a working household the work-optional date sentence (two dates, the
    graded one first); for a retired household the confidence statement. `src/ui/answerView.ts`,
    `verdictSentence.ts`, `dateSplit.ts` compose it today.
  - Left half: "Your plan" (or the what-if being edited, by name). Right half picker: Your plan · each kept what-if ·
    Recommended. The ring shows "X of 10" with the outcome word as its caption; the arc fills to X/10.
  - Under each ring, two small rows (MoneyGuide's tiered reading, 4.7): "As the survivor: X of 10" and "Essentials only:
    X of 10" when the plan has them (`SurvivorReading`, `ResolvedWire.floorReading`).
  - The bar: the median of `terminalValuesReal`, value printed **above** the bar in dark text (white on that green is
    2.9:1, below the text floor, 3.4).
  - The title chevron adds a second chart for a working household: **"Odds by stop year"**, a column chart of the date
    search's curve (`DateTrackOutcome.curve`, one column per stop year, its "X of 10" printed on top), the two dates
    marked with a flag icon and a word. This is B9's date view in RightCapital's grammar (B9 is ahead here: RightCapital
    has no stop-date search; its nearest is Iris's solve-for-target layout).

### 2.8 The Action Items tray (the what-if editor), the plan list, the Edit drawer

Screens: `rc-analysis/action-items__cleanshot-2024-10-28-at-15-44-44-copy.png` (the clearest),
`action-items__cleanshot-2024-10-28-at-16-24-46.png`, `FRAME_action-items-drawer-add-new-items-goals-menu.png`,
`FRAME_new-action-item-data-entry-drawer-roth-ira.png`, `FRAME_new-action-item-green-dot-row.png`,
`FRAME_add-or-remove-plans-drawer.png`.

- **Layout.** Two side-by-side column groups on `#f6f4f1`, each headed "Proposed plan | Current plan" over a thin rule.
  - **Left group (amounts and ages)**, sections in bold: Financial goals, Income, Savings, Expenses. Each row: the label
    (truncated with an ellipsis), a short slider (about 140 px, grey track, blue knob), a white input box about 200 px
    (`$` prefix, `%` suffix, or a grey locked "Max"), then the compared plan's value right-aligned as plain text.
  - **Right group (strategies)**, sections Strategies and Existing asset sales. Each row: label, a dropdown about 310 px
    ("Current allocation ▾", "Current strategy ▾", "Inflation Adjusted ▾"), the compared plan's choice as text.
    Social Security has indented sub-rows, one per person ("Barry Allen · Age 62").
  - Row height about 44 px at 1x, thin dividers between sections.
- **States.** A changed value turns blue (blue text on a pale blue `#e8eefb` box). Hovering a row gives it a pale blue
  band and a `⋮⋮` handle (rows reorder within a group). A row added only to this proposal has a green dot before its name
  and its name becomes a link that reopens its editor.
- **Footer**: `⟳ Reset` (copy the compared plan's values into this one) · `Edit` · `Refresh`. Nothing recomputes until
  Refresh.
- **Edit drawer** ("Add or remove action items"): "Select sections" with "Select all", a two-column checklist of every
  lever, and an "Add New Items ▾" button that opens the blue cascading menu (Goals ›, Income ›, Savings ›, Expenses ›).
  Picking a new item opens its data-entry drawer at once; after Save it sits in its group with a green dot. A new item
  belongs only to the proposal it was added in; Delete removes it everywhere.
- **Plan list drawer** (the pencil): Current plan and Proposed plan pinned on top, a divider, then named plans; hover a
  row for "+ Copy"; new plans are named in an inline box with a ✓; `⋮⋮` reorders; footer "Add New Plan" · OK.
- **B9's version: the eight lever kinds map one to one** (`WHAT_IF_LEVER_KINDS` in `src/shared/model.ts`, applied by
  `applyBundle` in `src/intake/whatIf.ts`, run by `src/ui/workbench/whatIfRun.ts`, composed by `railChrome.ts`):

  | Lever kind | Tray row | Column |
  |---|---|---|
  | `stop-year` | "Stop working in" (one calendar year for the household; slider + box) | left, Financial goals |
  | `spending` | the retirement spending total, or one row per budget line (add / replace / remove) | left, Expenses |
  | `deposits` | one row per account: yearly deposit (match and employer HSA as optional sub-rows) | left, Savings |
  | `claim-age` | Social Security, one indented row per person not yet claimed | right, Strategies |
  | `withdrawal-order` | Withdrawal order (pro-rata, taxable first, pre-tax first, bracket-fill, custom) | right, Strategies |
  | `roth` | Roth conversions (none, or the plan: amount, start, years) | right, Strategies |
  | `mix` | Asset allocation (stock / bond / cash); kept and compared, never applied (KTD15) | right, Strategies |
  | `aca-subsidy` | Enhanced ACA subsidy: on / off | right, Strategies (B9 only) |

  RightCapital's "Current plan" column is B9's plan as entered; "Proposed plan" is the kept what-if being edited. The
  plan list is the schema-v6 kept what-ifs list. The blue-when-changed mark gets a second cue: medium weight and a 2 px
  left bar on the box (the compared value in plain text beside it is already a non-colour cue). The green dot gets a "+"
  inside it. Workbench U15's pure composer (`railChrome.ts`) feeds this tray; its `.tsx` (`RailLevers.tsx`,
  `WhatIfPage.tsx`) is re-rendered in the new kit, not kept.

### 2.9 Retirement → Analysis → Confidence (the fan)

Screens: `rc-analysis/confidence-tab-retirement-analysis__cleanshot-2024-07-29-at-10-17-02-2x.png`,
`FRAME_confidence-legend-toggled-median-only.png`.

- Title "Asset simulation results of [plan]" (always the left-hand plan), no chevron: one chart.
- **A layered area fan**: x = age every 5 years (or year), y = money from `$0`. From the back: the outer band (5–95%, pale
  lavender `#dde1f5`), the inner band (25–75%, periwinkle `#a9b3ea`), the median (a solid 2 px `#5468d6` line). The fan
  pinches to a point at today and widens.
- **Hover**: a vertical grey crosshair and a tooltip with the age, then each band's low–high and the median in bold.
- Legend "● outer band ● inner band — Median"; each toggles; with the bands hidden the axis zooms to the median.
- **What RightCapital does not show**, which B9 keeps (cardinal rule): no marker for run-out futures, no line for the
  stop year, no thinning as couples die.
- **B9's version.** Bands are B9's p10–p90 and p25–p75 (`BandFan.byYear`), labelled with their real percentiles in place
  (in-place text inside each band, B9's band law), never relabelled 5–95. A vertical marker and word at the stop year
  (`DateBand.offsetYears`). A thin line under the axis, or a second small chart, for "share of futures run out by this
  age" from `depletionYears`. Late years where `cohortFraction` is thin fade and say so. The fan hue moves to
  RightCapital's periwinkle (oklch hue about 272, measured from their fills) while B9's lightness law stays (3.3).

### 2.10 Retirement → Analysis → Comparisons

Screens: `rc-analysis/comparisons-tab-retirement-analysis__cleanshot-2024-07-29-at-10-46-33.png`, `…-10-54-08.png`,
`FRAME_comparisons-return-scenario-dropdown-bad-decade.png`, `FRAME_comparisons-taxes-overlap-area.png`,
`FRAME_comparisons-assets-at-retirement-bars.png`.

- Chevron switcher with four charts: invested assets, net worth, taxes, assets at retirement. The first three are
  **overlapping area charts** (both plans from `$0`, not stacked; whichever is larger draws behind). Assets at retirement
  is two bars labelled by plan name. Key metric: "[Plan] has **$X more** ending assets than [plan]".
- **A return-scenario picker at the top right** (Baseline by default; Bad decade; a Fed scenario; Strong growth; Flat 0%;
  firm-defined ones). This tab is **one deterministic path**, not Monte Carlo.
- **B9's version.** The scenario picker offers B9's two named futures: **Steady** (every year the middle return, middle
  lifespans; RightCapital's Baseline) and **Rough** (the worst 30-year start in the committed historical series)
  (`steadyFuture` in `src/engine/simulate.ts`, `roughFuture` in `src/engine/reference/roughSequence.ts`). The series per
  year come from ledger rows of the plan and of the what-if (`tableRun.ts`, `whatIfRun.ts`). Overlap cue: the compared
  plan is an outline-only area with a dashed top line; the edited plan is a solid fill (3.4). The key metric names the
  view: "in the steady future" / "in the rough future", so a one-path chart is never read as the odds.

### 2.11 Retirement → Analysis → Savings (working years)

Screens: `rc-analysis/savings-tab-retirement-analysis__cleanshot-2024-07-29-at-13-16-56-2x.png`, `…-13-28-20/30/39/48-2x.png`.

- Four charts: this year's savings by account type (bars), savings over time (stacked bars per year to the first
  retirement), savings rate (% bars), total savings and returns (stacked area: starting portfolio, total savings,
  portfolio return). Key metrics: total yearly savings, savings rate, total income; invested assets at retirement.
- If anyone is already retired, only the first chart shows.
- **B9:** deposits per ledger (`LedgerLoopRow.contribution`) and the working-year lines (`LedgerWorkingYear`: pay, own
  deposits, payroll tax, left over). "Portfolio return" dollars are not a ledger field today (6).

### 2.12 Retirement → Analysis → Retirement Details

Screens: `rc-analysis/retirement-details-tab-retirement-analysis__cleanshot-2024-07-29-at-13-47-56-2x.png`,
`…-14-09-02-2x.png`, `…-2025-02-25-at-09-28-11-2x.png`, `blog__income-comparison.png`, `blog__retirement-spending.png`.

- Return-scenario picker at the top right. The chevron holds:
  - **Income sources** (stacked bars per year from retirement to the plan's end): Social Security (indigo `#5a58bc`),
    Pension (light blue), Annuity (teal), Other income (light green), Saving withdrawal (orange `#f09e36`), Shortage (red).
    Key metrics: "**$0** income shortage", "**44.3%** income is stable" (income that is not a withdrawal, over expenses).
  - **Withdrawal rate** (orange % bars per year).
  - **Retirement spending** (stacked area: living, tax, housing, other, health care) with lifetime total.
  - **Income comparison**: two donuts (this plan vs the compared one) by source, "**46%** Stable income" in the centre.
  - **Total spending comparison**: grouped bars per category, this plan solid, the other a lighter tint.
  - Guardrails and floor-and-ceiling charts, only when those spending rules are chosen.
- **B9:** from ledger rows: `socialSecurity`, `otherIncomeByPerson`, `draw` by bucket, `hsaSpend`, `spending`,
  `taxPaid`, `premiums`, `ranOut` (the shortage year). Cues: each stack segment tall enough carries its word; shortage
  gets a cross-hatch and sits on top; the legend lists the stack in stack order. Guardrail and floor-and-ceiling charts
  wait for map gap 9.

### 2.13 Retirement → Stress Test (map gap 8)

Screens: `rc-analysis/FRAME_stress-test-full-page-hover-tooltip.png`, `blog__blog-stress-test.png`,
`stress-test-action-items__cleanshot-2024-08-06-at-10-48-54-2x.png`, `FRAME_stress-test-loading-after-refresh.png`.

- One chart card, "Stress test – probability of success", plan picker at the top right. **Vertical bars, one per stress,
  y fixed 0–100%**, each a different colour, the name under each bar: Baseline (the plan, no stress) · Market drop now ·
  Market drop at retirement · Taxes · Social Security · Longevity · Inflation · Health care · Asset return · Combined (all
  chosen stresses at once). **No value labels**; the number shows only on hover.
- **Action Items**: a two-column grid of sliders written as sentences ("Equity markets drop immediately by `20%`", "You
  (and the co-client) will live `5 yrs. longer`", "Inflation will be higher by `1%`"). Each row: sentence, slider, value
  as text. Footer Edit · Refresh.
- **B9:** the same screen, with "X of 10" printed on top of every bar (no hover needed), the Baseline bar drawn as an
  outline with its word, and the Combined bar hatched. Engine work: fixed shocks applied on the one shared draw
  (architecture §3 allows a fixed tilt; the map's gap 8 note). Several neighbouring bar colours sit under the 0.10 floor
  even for normal vision (3.4): the axis names and the printed values carry the bars, never the hue.

### 2.14 Retirement → Social Security (map gap 7)

Screens: `rc-analysis/FRAME_social-security-cumulative-break-even.png`,
`comparison-tab-social-security-module__cleanshot-2025-07-08-at-10-08-16-2x.png`,
`summary-tab-social-security-module__cleanshot-2024-02-26-at-17-45-03.png`,
`FRAME_social-security-action-items-filing-instructions.png`.

- Title, intro, folder tabs Comparison · Summary.
- **Comparison**: two pickers with "vs" between them (optimal, current, as early as possible, full retirement age, 70).
  Chevron: *Annual* (paired thin bars per year, A blue, B light grey) and *Cumulative* (two lines, A dark indigo, B
  lighter blue; the crossing is the break-even). Key metric: "**$394,620 more** from …" or "**Age 78** break-even point
  between …". The crossing is not marked on the chart.
- **Summary**: five bars of lifetime benefits, one per strategy. Key metric: the optimal strategy's total.
- **Action Items here are instructions**: a numbered list ("1. [person] applies at 70 …").
- **B9:** runs per claim-age choice on the what-if runner (the `claim-age` lever); benefits from ledger `socialSecurity`.
  B9 marks the crossing on the chart with a ring marker and its age label, and draws B as dashed. The "optimal" search
  is L (map gap 7); until it lands the picker offers 62, full retirement age, 70 and "your plan".

### 2.15 Retirement → Health Care

Screens: `rc-analysis/health-care-cost-analysis__cleanshot-2026-09-22-at-11-35-47-2x.png`, `…-2026-09-21-at-17-07-22-2x.png`,
`health-care-medicare-options__cleanshot-2026-09-21-at-16-50-06-2x.png`, `…-16-44-59-2x.png`,
`health-care-preferences__cleanshot-2026-09-21-at-17-00-18-2x.png`.

- Folder tabs Cost Analysis · Medicare Options · Preferences.
- **Cost Analysis**: *summary* is small multiples, one bar chart per person on a shared scale, bars per age band (Pre-65,
  65–80, 80+), with "**$1,539,689** John's total cost" per person in the key-metric column. *Cost* is stacked bars per
  year (pre-Medicare, Medicare premium, out of pocket, extra) with a vertical list of totals. Action Items: a per-person
  grid (Medicare choice, cost approach, pre-Medicare, Part B "estimated from income", Part D, out of pocket).
- **Medicare Options**: a two-part ✓/✗ table, a donut of annual cost, a ✓/✗ comparison matrix across Original Medicare,
  + Medigap, Advantage (beige header, 2 px aubergine top rule, zebra rows), three cost donuts, and plain enrollment
  instructions with outside links. ✓/✗ are filled circles with a tick or cross: safe, the shapes differ.
- **Preferences**: five dropdowns with line icons, each option a first-person sentence.
- **B9 (ahead here):** `HealthReadout.byYear` gives per-year medians of the net ACA premium, base Medicare, the IRMAA
  surcharge and the extras; `TaxAwareWire` gives lifetime totals. Pre-65 ACA years, the subsidy cliff (`overCliffFraction`)
  and IRMAA's two-year lag are B9's; draw them in the same stacked-bars grammar (ACA net premium as its own series with
  its word; the cliff share as a printed % above each pre-65 bar). Per-person split is not emitted today (6). Medicare
  Options' ✓/✗ matrix and Preferences need fields B9 does not ask; leave them out until a gap asks for them.

### 2.16 Retirement → Cash Flows (the year-by-year table)

Screens: `rc-cashflow-tax/help-retirement-cash-flows-summary-tab-cash-flows-51.png` and `-51-later.png`, `-02.png`,
`-06.png` (drill views), `help-retirement-cash-flows-accounts-tab-cash-flows-02.png`,
`help-retirement-cash-flows-invested-asset-tab-cash-flows-01.png`, `help-retirement-cash-flows-maps-cash-flows-51.png`,
`-53-later.png`.

- Folder tabs Maps · Summary · Net Worth · Invested Asset · Accounts.
- **Summary**: header row "Summary" left; at the right a return-scenario select, a plan select and the download button.
  The table (2.0's chrome) with group headers Cash Inflows / Cash Outflows and columns **Year | Age | Income Inflows |
  Planned Distribution | Other Inflows | Total Inflows | Expenses | Goals | Tax Payment | Planned Saving | Total Outflows |
  Spend Unsaved Cash Flows | Net Flows**. Underlined headers drill: the panel title becomes a breadcrumb
  ("Summary / Tax Payment") and the table becomes that column's breakdown (Tax Payment → Federal | State | FICA | Local |
  Total), each level drillable again; click "Summary" to go back.
- **Accounts**: the title is a table switcher (ending balance by account / additions / RMDs / withdrawals / net cash
  flows); columns Year | Age | Taxable | 401(k) | IRA | Roth | 529 | Total, each drillable to single accounts. Roth
  conversions show here as money moving between columns.
- **Invested Assets**: a roll-forward: Year | Age | Beginning Balance | Planned Saving | Employer Match | Planned
  Distribution | Net Cash Flows | Portfolio Return | Ending Balance.
- **Net Worth**: Year | Age | asset classes | debts | Net Worth.
- **Maps**: a timeline scrubber (a dashed line from first to last year, hollow end caps labelled with the year in bold
  and both ages under it, a blue map pin for the chosen year, retirement years marked). Under it a horizontal **Sankey**
  ("Waterfall"): inflow sources (green nodes) → Total Inflows → outflow groups (Expenses red, Tax Payment grey, Planned
  Saving blue) → leaves, links in pale tints of the node colour, labels "**Bold name**: $amount". A second view,
  Breakdown, shows the same as columns of tinted tiles with a 4 px left bar, each expandable.
- **B9's version.** B9's table is built (workbench U2–U7: `src/ui/workbench/yearTableChrome.ts`, `tableRun.ts`,
  `YearTable.tsx`); it is re-rendered in RightCapital's chrome, its laws kept (every figure is one row field; `~` on
  projected figures; the non-colour `+`/`−` direction mark). The scenario select offers Steady and Rough. Column mapping:
  - Income Inflows ← pay by person, Social Security, other income by person (drill to each).
  - Planned Distribution ← the draw by bucket (taxable, pre-tax, Roth) and HSA spend; RMD as its own drill column.
  - Tax Payment ← the portfolio's tax (`taxPaid`) and the working year's payroll tax and tax on outside income.
  - Expenses ← `spending`, and the health premiums (ACA net, Medicare, IRMAA surcharge, extras) as a drill.
  - Planned Saving ← deposits per ledger.
  - B9-only columns: Roth conversion; income not kept (R13's flag); a short year (`ranOut`).
  - Accounts tab ← `start`, `end`, `draw`, `conversion`, `rmd`, `contribution` per ledger (and per person for pre-tax).
  - Federal vs State vs FICA split, Goals, Other Inflows, and Net Worth beyond invested money are not emitted today (6).
  - Maps: one year's ledger row feeds the Sankey (Highcharts' sankey module); build after the tables.

### 2.17 Tax → Tax Strategies (B9's recommendation in RightCapital's clothes)

Screens: `rc-cashflow-tax/help-tax-tax-strategies-roth-conversion-strategy-51.png` (Summary),
`rcsite-tax-planning-roth-conversion-modeling.png` (Calibration), `help-tax-tax-strategies-calibration-tab-05.png` (IRMAA),
`help-tax-tax-strategies-comparison-tab-03.png`, `-05.png`, `help-tax-tax-strategies-details-tab-02/03/04.png`,
`rcsite-tax-planning-identify-top-tax-strategies.png` (Strategies), `help-tax-tax-strategies-strategies-tab-01.png` (empty),
`help-tax-tax-strategies-strategies-tab-51-later.png` (calculating), `help-tax-tax-strategies-roth-conversion-strategy-51-later.png`,
`-53-later.png` (Action Items).

- Folder tabs Summary · Calibration · Comparison · Details · Strategies.
- **Summary**: "Summary of tax strategy ⌄", a plan picker. **Grouped bars, proposed (green) vs reference (blue)**, over
  tax-adjusted ending assets · federal taxes paid · withdrawals from tax-deferred accounts; y in `$mm`. Key metric:
  "Proposed strategy results in / **$35,960 less** / tax adjusted ending assets", three times. Second chart: Asset
  location (a big donut and three small ones per tax bucket).
- **Calibration**: four charts. *Ordinary income tax bracket*: x = age, y = dollars; two overlapping areas, taxable income
  with conversions (green) and without (blue); **bracket thresholds as thin coloured lines that rise with inflation** (10%
  sky, 12% teal, 22% sand, 24% orange, 32% red, 35% grey); legend items toggle; key metric "**$5,842,798 more** tax
  adjusted ending assets than the Reference strategy". *Medicare premium bracket (IRMAA)*: the same with MAGI and tier
  lines labelled by their monthly surcharge ("+$83 per month" …). *Key tax components*: a stacked area of what makes up
  taxable income. *Capital gains bracket*.
- **Comparison**: six charts (invested assets, federal tax paid, RMDs, tax-adjusted ending wealth, withdrawals, account
  balance); withdrawals are **two side-by-side stacked areas** (proposed, reference), taxable / tax-deferred / tax-free.
- **Details**: a table switcher: *Withdrawal and conversion* (Year | Age | Conversion Amount | Withdrawal from Taxable |
  from Tax Deferred | from Tax Free | the three balances); *Tax details* (Adjusted Taxable Income | Federal Tax | Federal
  Bracket | Capital Gains Bracket); *Medicare premium* (MAGI | first IRMAA threshold | premium per person | total).
- **Strategies**: empty state "generate the strategies with the largest ending value" + a solid blue "Solve for Top
  Strategies" button. While it runs: "◯ Calculating". Result: "Top strategies", five rows: a left column of solid blue
  cells holding tax-adjusted ending assets, shaded strong blue for the best down to pale for the fifth (colour ranks the
  rows), a thin arrow, then three beige cells: asset location, withdrawal order, Roth conversion strategy ("IRMAA + $485
  per month", "32% ordinary income bracket").
- **Action Items**: two columns, proposed and reference: withdrawal sequence select; conversions (type, target bracket
  or IRMAA tier, a "fill up the bracket" slider reading None / 12% / 24%, accounts to convert from, start and end,
  multiple periods); estimated terminal tax rate (heirs' rate on leftover pre-tax money).
- **B9's version (ahead: B9's solver grades its own confidence and RightCapital's does not).**
  - **Strategies tab = B9's solve**: the Winner card on top (4.1: the dollar gain over "no change" from the paired
    difference, "N strategies compared", the winner in one sentence, its grade, Apply / See the others), then the ranked
    table with a **rank number column** (1 to 5) beside the shaded value cells, the winner, the runner-up and the
    no-change baseline always shown (`SolveRecommendation.winner`, `runnerUp`, `noActionBaseline`, `rankedIds`,
    `prunedScores`, `grade`, `namedDriver`, `deltaSkew`).
  - **Summary**: grouped bars winner vs no-change on lifetime tax (`lifetimeTaxPaidReal`), what heirs keep after tax
    (the terminal buckets with the heir bracket), pre-tax withdrawals. Cue: the reference bars hatched, values printed.
  - **Comparison and Details**: ledger runs of the winner's and the baseline's levers (`roth` + `withdrawal-order`) on
    the Steady future, through the what-if runner.
  - **Calibration** waits for U22 and the yearly yield U23 (map gap 6): `magiLandscape.ts` computes the bracket and IRMAA
    lines inside the engine but does not emit them per year. Every threshold line carries its label at its right end
    ("22%"), not only in the legend.
  - The "fill to a line" conversion type is U19 (map gap 6).

### 2.18 Tax → Tax Estimate (map gap 10)

Screens: `rc-cashflow-tax/help-tax-tax-estimate-effective-tax-rate-51-later.png`,
`help-tax-tax-estimate-estimate-tab-tax-estimate-51-later.png`, `help-tax-tax-estimate-details-tab-tax-estimate-51.png`, `-01.png`.

- **Estimate tab**: one chart, switcher Effective tax rate / Federal income tax bracket / Capital gains bracket, plan
  picker. Effective rate is a **stacked area by age** (Federal blue, State green, FICA orange, Local purple; areas about
  70% opaque with a darker 2 px top line), y 0–35%; tooltip with the age and each rate.
- **Details tab**: form, year and plan selects; below, **a copy of the IRS Form 1040 page**: the form's lockup, its pale
  aqua background (about `#e3f7f6`), bold line numbers, dotted leaders, white cells holding projected numbers, grey
  unused cells. The form select also offers Schedules 1–3, A, B, D, Form 6251 and the taxable Social Security worksheet.
- **B9:** per-year federal and state tax as separate figures and the top bracket are not emitted (`taxPaid` is federal
  and state together); the 1040 view is M. Both are map gap 10. The 1040 is a public government form, so drawing it is
  fine; its layout is the IRS's, not RightCapital's.

### 2.19 Investment → Asset Allocation, Tax Allocation (and later Allocation Path, Holdings)

Screens: `rc-cashflow-tax/help-investment-asset-allocation-51.png`, `-54-later.png`, `-52-later.png` (loading),
`help-investment-tax-allocation-51-later.png`, `help-investment-allocation-path-01.png`, `help-investment-holdings-01.png`.

- **Asset Allocation → Summary**: two thick donuts facing each other, "Current allocation" (picker: all accounts, by
  owner, by tax bucket) and "Target allocation" (picker of model portfolios), each with "79% / 21%" equity / fixed in the
  centre and "Annual return / Standard deviation" under it; between them a three-column legend table (current % | ●
  asset class | target %). **Detail**: a Category | Asset Class | Current | Target table beside a diverging bar chart
  centred on 0%.
- **Tax Allocation**: a donut "Your Portfolio" split Taxable / Tax deferred / Tax free beside three big numbers; click a
  slice or number to zoom into that bucket's accounts.
- **Allocation Path**: a 100% stacked area by age (equity, fixed income, cash) with starting allocation and glide path
  pickers. **Holdings**: a sortable table (account, owner, ticker over fund name, quantity, price, value, cost basis,
  gain/loss).
- **B9:** current mix per account and the household blend (entered), the `mix` lever as the target (kept and compared,
  never applied); tax buckets from entered balances. B9 has one stock / bond / cash split, so the donut has three
  segments, not RightCapital's eight asset classes; the legend table says so. Allocation Path needs a mix that changes
  over time (map row: M); Holdings is U20. Different mixes per account stay barred by the one-shared-draw rule.

### 2.20 Settings (the gear) and the Display settings drawer

Screens: `rc-shell/plansettings-02.png`, `rc-analysis/FRAME_display-settings-drawer.png`.

- **Settings**: folder tabs across the top (Methodology, Return Assumptions, Account Assumptions, Tax Assumptions, Other
  Assumptions). "Calculation options" heading, then a two-column grid of full-width dropdowns, **each with a one-sentence
  plain explanation under it that changes with the choice**. Copy this for B9's assumptions page: B9's
  `src/ui/assumptionRegistry.ts` and the intake's `AssumptionPanel.tsx` logic already list what the answer used.
- **Display settings drawer**: three toggles with ⓘ: Today's dollars · same scale for both Probability charts · show
  years instead of ages on chart axes. Cancel / Save.
- **B9:** today's dollars is the engine's native unit (it runs in real dollars), so B9's default matches RightCapital's.
  A future-dollars view needs the run's inflation applied per year; check `src/engine/priceIndex.ts` before building the
  toggle. B9 adds Income Lab's banner line under the folder tabs on every value screen: "Values in today's dollars,
  rounded" (4.2).

### 2.21 The mobile shape

Screens: `rc-cashflow-tax/mobile-overview.png`, `mobile-investment-later.png`, `rc-shell/site-homepage-client-collaboration-anytime.png`.

- RightCapital's phone app is a client companion (Dashboard, Budget, Investment, Tasks, Vault as bottom tabs): a blue
  net-worth hero card, alert rows, a small ring, plain account rows. It has no Cash Flow table, Tax or Analysis screen.
- **B9's phone** (laptop primary, phone must work): the same screens, stacked. The top bar becomes the B9 mark, the
  names and a menu button that opens a sheet of modules and sub-tabs; folder tabs become a horizontal scroll strip; the
  key-metric column drops under its chart; the Action Items tray becomes a full-height bottom sheet; drawers become
  full-screen sheets; tables keep a sticky Year/Age column and scroll sideways. Snapshot cards stack in one column.

### 2.22 Screens left out (and why)

Insurance (Life, Disability, LTC, Property and Casualty), Education, Estate (Flow, Details, Trust, Checklist,
Beneficiaries), Dashboard's Liquidity, Budget and Tasks, the More menu (Debt, Student Loan, Stock Plans, Business,
Calculator, Notes), the document Vault, Tax Analyzer (built on uploaded returns), Iris, the chat button, the advisor
portal and client switcher, account linking: all out by the map's §8 (Briggsy, 2026-11-09). The lane reports describe
them in case a ruling changes (`reports/rc-cashflow-tax.md` §5–6, `reports/rc-shell.md` §2.3–2.4, §6).

---

## 3. Visual language: the design-system spec

### 3.1 Chrome palette (RightCapital's tokens; B9 copies them)

Exact values come from RightCapital's shipped CSS (`app.rightcapital.com`, Tailwind v4.3.3) and the fills inside their
product SVGs; screenshot readings agree within a few points.

| Token (B9 name) | Hex | Role |
|---|---|---|
| `--bg` | `#ffffff` | page, top bar, panels |
| `--stone-50` | `#fbf9f7` | table zebra |
| `--stone-100` | `#f6f4f1` | card bodies, list rows, the Action Items tray |
| `--stone-200` | `#f0ede8` | sub-nav bar, active module block, inactive folder tabs, table headers, read-only inputs, drawer footer |
| `--stone-250` | `#e6e2dc` | table group headers |
| `--stone-300` | `#d8d2c8` | hairline borders (panels, cards, inputs) |
| `--stone-400` | `#a8a29e` | decorative only (rules, dotted spines, the Sankey's tax grey). 2.5:1 on white: never text |
| `--stone-500` | `#78716c` | muted text, axis labels (4.8:1 on white) |
| `--stone-600` | `#57534e` | body text, nav words (7.6:1) |
| `--stone-900` | `#1c1917` | numbers and strong text |
| `--plum` | `#5c4c64` | page and chart titles, card header bands, drawer header, Total band, person icons, stepper done/current, table top rule (7.9:1 with white) |
| `--plum-dark` | `#3d3344` | the selected card's band |
| `--blue` | `#5070e6` | underlines, slider knobs, chart fills, ring start, the ACTION ITEMS bar |
| `--blue-ink` | `#3d57d9` | link text and primary-button fill (RightCapital's "Deep Blue"; 5.9:1 with white). `--blue` itself is 4.37:1, under the 4.5 text floor |
| `--blue-tint` | `#eef1fc` | link tints, changed-value box (`#e8eefb` in the tray) |
| `--green` | `#56a58c` | proposed series, asset bars, ring end |
| `--coral` | `#e95b67` | debts, expenses, Delete |
| `--orange` | `#f09e36` | tax-deferred, withdrawals |
| `--sky` | `#5ebaf3` | stat-ring dashes, insurance tiles |
| tints | `#eef6f4` mint · `#fdeff0` blush · `#fdf3e7` sand | Blueprint and Breakdown tile fills, Sankey links |

### 3.2 Data series (RightCapital's order) and their second cue

RightCapital's meaning by colour, kept: **green = the proposal / what-if / recommendation; blue = the plan it is
compared against**; orange = tax-deferred or withdrawals; green = tax-free; blue = taxable; red = expenses, shortfall or
over a line. Categorical order as they use it: blue `#5070e6`, green `#56a58c`, orange `#f09e36`, light green `#8ed88e`,
sky `#53c0f1`, red `#e95b67`, indigo `#5a58bc`, orchid `#b971c6`, purple `#8466c5`, deep indigo `#3d3baa`, sand
`#e1bd74`, teal `#25a88b`, salmon `#e0897f`.

**The second cue for every pairing (B9 law: colour is never the only signal):**

| Where | Colour (kept) | Second cue (added) |
|---|---|---|
| Plan vs proposal, lines | blue vs green | compared plan dashed with hollow markers; edited plan solid with filled markers; direct end-labels; legend chips ■ filled vs □ hollow (ProjectionLab) |
| Plan vs proposal, overlapping areas | blue vs green | compared plan as outline only with a dashed top line; edited plan solid fill |
| Plan vs proposal, grouped bars | blue vs green | reference bars diagonal-hatched; value printed on every bar; category under each group |
| Assets vs debts | green vs coral | debts below the zero line or in their own bar, values in parentheses, the word on the axis |
| Tax buckets in stacks | blue / orange / green / sky | taxable solid, pre-tax diagonal hatch, Roth dots, HSA horizontal lines; stack order fixed and listed in the legend top to bottom |
| Income sources stack | indigo / light blue / teal / light green / orange / red | segment words where they fit; shortage cross-hatched and on top; hover list of every value |
| Bracket and IRMAA lines | sky / teal / sand / orange / red / grey | a text label at each line's right end ("22%", "+$83/mo") |
| Stress test bars | ten hues | the stress name under each bar (theirs) plus "X of 10" printed on top; Baseline outlined; Combined hatched |
| Top strategies ranking | blue shade by rank | a rank number column |
| Changed value in the tray | blue text, blue tint | medium weight and a 2 px left bar; the compared value in plain text beside it |
| Added-only-here lever | green dot | a "+" inside the dot |
| The ring | blue→green gradient (carries no meaning) | the number and the outcome word in the centre |
| Confidence fan | one hue, three lightnesses | percentile text inside each band; median a solid line; lightness ordered (grayscale-safe) |

Highcharts' `pattern-fill` module draws the hatches and dots (section 5); markers use its built-in symbols (circle,
square, triangle, diamond).

### 3.3 The confidence band and the ring

- RightCapital's fan is already a single-hue lightness ramp, which is B9's band law. Measured in oklch: median line
  `#5468d6` (L 0.56, hue 272), inner band `#a9b3ea` (L 0.78, hue 276), outer `#dde1f5` (L 0.91, hue 277). B9's ramp sits
  at hue 244 (Okabe–Ito blue) with L 0.42 (median) to 0.82 (outer) and chroma 0.095 (`src/viz/palette.ts`). For the
  clone: move `BAND_HUE` to about 272, keep B9's L stops and chroma cap, and re-run `src/viz/__tests__/colorblind.test.tsx`
  (gamut and monotonic-luminance checks).
- The ring: stroke about 16 px on a 300 px ring, gradient `#5070e6` (top) to `#56a58c` (bottom), unfilled `#ececec`,
  centre number about 56 px bold `--stone-900`, caption about 18 px `--plum`. No zones, no threshold tick.

### 3.4 Measured colour-blind check of RightCapital's pairs

Same metric B9's palette test pins (culori `filterDeficiency*` at full severity, then oklab Euclidean distance; B9's
floor for a categorical pair is 0.10). Run 2026-11-24 for this doc.

| Pair | normal | deuteranopia | protanopia | tritanopia | Verdict |
|---|---|---|---|---|---|
| blue `#5070e6` vs green `#56a58c` (plan vs proposal) | 0.227 | 0.198 | 0.216 | 0.108 | passes, tritan barely; luminance contrast only 1.49, so keep the line-style cue |
| green `#56a58c` vs coral `#e95b67` (assets vs debts) | 0.257 | **0.057** | 0.152 | 0.312 | **fails deuteranopia**: never colour alone |
| light green `#8ed88e` vs sand `#e1bd74` (series colours 4 and 11) | 0.116 | **0.040** | **0.045** | 0.159 | **fails**: never side by side without labels |
| stress bars: Social Security `#9fd691` vs Inflation `#e0bc77` | 0.099 | **0.032** | **0.049** | 0.136 | **fails**, even near the floor for normal vision |
| stress bars: Baseline `#5a57b8` vs Combined `#7c63bf` | 0.065 | **0.058** | **0.045** | **0.068** | **fails for everyone**: only the axis names tell the ten bars apart, so B9 prints names and values on every bar |
| orange `#f09e36` vs green `#56a58c` (pre-tax vs Roth) | 0.214 | 0.185 | 0.110 | 0.288 | passes, protan barely: add the pattern |
| orange `#f09e36` vs coral `#e95b67` (24% vs 32% lines) | 0.174 | 0.183 | 0.213 | 0.102 | passes, tritan barely: end labels |
| blue `#5070e6` vs coral `#e95b67` | 0.302 | 0.232 | 0.202 | 0.327 | passes |
| indigo `#5a58bc` vs orange `#f09e36` (SS vs withdrawals) | 0.382 | 0.387 | 0.336 | 0.363 | passes |
| blue `#5070e6` vs grey `#cfcfcf` (SS strategy pair) | 0.326 | 0.337 | 0.307 | 0.295 | passes |

Text contrast measured the same day (WCAG): `--blue` on white 4.37 (fails 4.5 for body text: use `--blue-ink`); white
on the green bar 2.93 (fails: print values above the bar); white on coral 3.41 (bold 18 px+ only); `--stone-500` on
white 4.80 (passes); `--stone-400` 2.52 (decoration only).

The CVD test in `src/viz/__tests__/colorblind.test.tsx` should gain every categorical pair that ever sits side by side
in the clone, each asserted to pass the floor or to be listed as "carried by its second cue".

### 3.5 Type

- RightCapital: **Roobert** (Displaay foundry, licensed, Regular and SemiBold), a geometric grotesk. It cannot be lifted.
- **B9: Figtree** (OFL, `@fontsource-variable/figtree`, self-hosted so `font-src 'self'` holds). Geometric and friendly
  like Roobert; its file carries the `tnum` feature (checked in the Google Fonts TTF, 2026-11-24; confirm tabular figures
  render in the first build). It replaces Fraunces and Source Sans 3. RightCapital uses no serif.
- Weights: 400 for nearly everything, 300 for page titles if it reads closer, 600 for card band labels, table totals,
  drawer section heads and big numbers. Nav words letter-spaced about 0.01em; card band labels uppercase 600.
- Scale at a 1440 window (1x CSS px):

| Role | Size / weight | Colour |
|---|---|---|
| Page title | 40 px / 400 (compact: 32 px) | `--plum` |
| Stepper step title | 32 px / 400 | `--plum` |
| Chart title, panel sub-head | 22 px / 400 | `--plum` |
| Key-metric number | 30 px / 400 | `--stone-900` |
| Key-metric words | 22 px / 400 | `--plum` |
| Ring centre number | 56 px / 600 | `--stone-900` |
| Intro line, drawer paragraphs | 18 px / 400 | `--stone-600` |
| Nav words, sub-tabs | 16–18 px / 400 | `--stone-600`; active `--stone-900` |
| Folder tabs, body, table cells | 16 px / 400, `tabular-nums` on every number | `--stone-900` |
| Labels, legends | 14–15 px / 400 | `--stone-600` |
| Axis labels | 12 px / 400 | `--stone-500` |
| Card band label | 14 px / 600 uppercase | white |

- Numbers: no `$` in table cells; `$` and commas in metric columns and tiles; axes in `$k` / `$mm` (RightCapital writes
  millions as "mm"); negatives in parentheses; B9's `~` before projected figures stays.

### 3.6 Spacing, radii, borders, shadows, density

- **Spacing**: Tailwind's 4 px scale. Panel inner padding 48 px (compact 32); card and grid gaps 24 px; drawer field
  rows 24 px apart; form columns 24 px apart.
- **Radii** (RightCapital's own tokens): `xxs` 2 px, `xs` 4, `sm` 6, `md` 8, `lg` 10, `xl` 12, `2xl` 16. Panels,
  tables, tiles, folder tabs: 0. Buttons, inputs, selects: 2–4. Snapshot cards: 12. Tooltips: 4. Phone cards: 12.
- **Borders**: 1 px `--stone-300` everywhere; a 2 px `--plum` rule over tables; the active folder tab's border opens
  into the panel.
- **Shadows**: none on panels, cards, tables. Only tooltips (soft, about `0 2px 8px rgb(0 0 0 / 0.12)`), floating menus
  and the drawer's left edge.
- **Density**: roomy. Profile cards about 300 × 280 px; list rows about 56 px; tray rows about 44 px; table rows 32–36 px.
- **Compact mode for Briggsy's laptop (1440 × 731, measured 2026-11-19).** RightCapital's chrome puts the panel's top
  about 370 px down the page, which leaves about 360 px of a 731 px window for the chart. B9's one-frame fit law
  (`pnpm verify:fit`) then fails on most screens. Under `@media (max-height: 800px)`: top bar 48 px, sub-nav 40 px,
  title 32 px, intro one line, panel padding 32 px, ring 220 px. That puts the panel's top about 210 px down. Same look,
  tighter.

### 3.7 Charts

- Highcharts in styled mode; every style lives in B9's chart CSS (section 5).
- Time charts: x = age every 5 years by default (years by a display setting); both ages where one year is labelled.
- Areas: about 70% opaque fill with a 2 px darker top line; overlap for two plans, stack for parts of one.
- Bars: square tops (2 px radius at most), wide bars, wide gaps; values printed on or above the bar (B9 always prints;
  RightCapital often hides them in the tooltip).
- Donuts: ring about 25% of the radius, a big centred number and a one-word caption.
- Threshold lines: thin, coloured, rising with inflation, labelled at their right end.
- Gridlines: faint horizontal only (`--stone-200`); no vertical grid; no chart border; no dark mode.
- Legend: centred under the chart, dot markers (dash for lines), toggles series.
- Motion: a short ease-out morph from old to new values (about 250 ms); first draw once; reduced motion drops movement.

### 3.8 Icons

Thin single-weight line icons, white on plum bands and plum outlines in rows: dollar bill (salary), an eagle mark (Social
Security), piggy bank (savings), bank building, card, bar chart with a pie (investment), house, beach chair (retirement),
heart with a pulse line (health), mortarboard, sofa and lamp (living expenses). B9 uses **lucide** equivalents
(`banknote`, `landmark`, `piggy-bank`, `credit-card`, `chart-pie`, `house`, `umbrella`, `heart-pulse`, `sofa`,
`hand-coins`, `receipt`) at 1.5 px stroke. Never RightCapital's icon files; never the SSA's seal (use `landmark` or
`badge-check`). Icons always sit beside a word.

### 3.9 B9's token file, in one place

One Tailwind `@theme` block in `src/ui/styles/theme.css` (the new home; `tokens.css` retires): the chrome tokens of 3.1,
the type scale of 3.5, the radii of 3.6, and the series tokens of 3.2, with the compact overrides under the height query.
`src/viz/palette.ts` stays the canonical home for data colours and their CVD test; its exports feed the chart CSS
variables (`--series-color-0…12`), so a hex is typed once. The old brand green (`#0b3d2e`), cream paper (`#faf7f2`) and
Okabe–Ito picks retire from the chrome.

---

## 4. Patterns to borrow from the other planners

Each one fills a gap RightCapital leaves, and each has a home in a RightCapital frame. Ranked by value to B9.

1. **The Winner card with Apply** (ProjectionLab Optimize; `diy/pl-optimizer-results.png`, `advisor/projectionlab-home-optimize.png`).
   A big delta first ("$X more left to heirs than changing nothing"), "N strategies compared" under it, one card naming
   the winning strategy in a sentence with small lever chips, and two buttons, Apply / See the others; under it a chart
   of the winner (solid) against no change (dashed) with a measure picker and both values in the tooltip. *Why:* it is
   B9's recommend-second moment already solved, and its plan-vs-baseline cue is line style and fill, not hue. *Home:*
   top of Tax → Tax Strategies → Strategies, and the Snapshot's Recommendations card.
2. **"Values in today's dollars, rounded" banner** (Income Lab; `advisor/ilhelp-track-implemented-plan.jpg`). *Why:* one
   line kills a class of misreadings. *Home:* under the folder tabs of every value screen.
3. **The guardrail if/then card** (Income Lab, same screenshot): "If balance drops to $X → spending becomes $Y", with an
   arrow icon and the word, not just red and green. *Why:* the plainest honest risk display found; colour-blind safe.
   *Home:* Retirement Details, when map gap 9 (spending that reacts) lands.
4. **The question-then-answer intro** (Income Lab Social Security: the page states its question, then a one-sentence
   answer with the number bold). *Why:* RightCapital's intro line is generic; B9 fills that slot with its answer. *Home:*
   every page head.
5. **Event icons on every time chart, both ages in every tooltip** (ProjectionLab, Boldin, Pralana). *Why:* ties "the line
   dips here" to "because you stop working here". *Home:* stop work, Social Security claims, Medicare at 65, RMD start,
   first death, as icons with words above the plot.
6. **A year inspector** (ProjectionLab; `diy/pl-home-hero.png`): hover or scrub a year and a side card lists every number
   for that year, each label tinted and named, so it doubles as the legend. *Why:* answers "what happens in 2031?"
   without the table. *Home:* a side panel option on Comparisons and Cash Flows → Maps (RightCapital's year pin already
   picks the year).
7. **Success split by tier** (MoneyGuide's Needs / Wants / Wishes ladder, `advisor/mg-index-feature-whatareyouafraidof.jpg`).
   *Why:* B9 already reads essentials and the full plan separately. *Home:* the two small rows under each Probability ring.
8. **Bracket headroom made visible** (Income Lab Tax Lab and Holistiplan: the income bar over shaded bracket bands with
   the room left in the current bracket drawn as an empty outlined box; the current bracket row outlined in a table;
   `advisor/hp-Holistiplan-Marginal-Tax-Brackets.png`, `advisor/ilhelp-taxlab-taxbrackets.jpg`). *Why:* the clearest Roth
   conversion picture found. *Home:* a third chart in Tax Strategies → Calibration (with U22).
9. **Recommendations become ordinary plan items** (Boldin; `diy/boldin-roth-opportunity-2.png`): after Apply, each
   conversion shows as a dated transfer (from, to, year, amount) and a table by account. *Why:* "show your work in their
   own numbers" (D7). *Home:* Profile → Savings cards and the Tax Strategies Details table.
10. **Computed values beside inputs, read-only** (ProjectionLab's Medicare dialog, `diy/pl-medicare.png`). *Why:* the
    household sees what the engine derived (Part B with IRMAA, the ACA credit). *Home:* inside the drawers.
11. **"Last run" stamp and a changed-since line** (Pralana, `diy/pralana-online-06.png`). *Why:* B9's solves are slow;
    say when the shown result was made and that edits are pending. *Home:* the stale banner (2.0).
12. **A measure picker plus Chart | Table** (MaxiFi Compare Annual; ProjectionLab "Table · N years"). *Why:* every chart
    is one click from its numbers. *Home:* a table toggle beside the download button on Comparisons and Tax Strategies.
13. **"How often and how big are the cuts"** (Income Lab Test Plan, `advisor/ilhelp-testplan-02.png`). *Why:* more useful
    to a retiree than one percent. *Home:* with map gap 9.
14. **Empty states that point** (TPAW's "Start here" and "Waiting for your inputs…", `diy/tpaw-guest-empty-state.png`;
    Boldin's segmented completion bar). *Home:* the stepper and any screen whose inputs are missing.
15. **A different marker shape per percentile line** (MaxiFi, `diy/maxifi-home-14.webp`). *Why:* a ready colour-blind
    technique. *Home:* any percentile-lines view.

**Not to copy:** red / yellow / green probability zones with no word (eMoney, Boldin's speedometer); rotated every-year
axis labels and default chart styling (MaxiFi, Pralana); hiding features in odd places (ProjectionLab's reviewers' main
complaint); any series told apart by hue alone.

---

## 5. The stack

From `reports/tooling.md` (versions read from npm and the vendors' sources on 2026-11-24).

**What RightCapital ships**, read from its own login page and CSS: React, **Tailwind CSS v4.3.3**, **Highcharts in
styled mode** (`<body class="highcharts-light">`, `.highcharts-color-N { fill: var(--series-color-N) }`), a router,
Tiptap, some emotion CSS-in-JS. Building on the same two pieces makes their spacing, radii, palette and chart styling a
matter of CSS.

**B9's stack for the rebuild:**

| Piece | Package | Why |
|---|---|---|
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | RightCapital's layer; compiles to one static CSS file (CSP clean) |
| Components | shadcn/ui on **Base UI** (`@base-ui/react`, shadcn's default since July 2026) | tabs, sheets (drawers), selects, sliders, switches, number fields, tooltips, toasts as code we own; Base UI injects no `<style>` once `CSPProvider disableStyleElements` is set |
| Charts | **Highcharts 13** + `@highcharts/react`, `chart.styledMode: true` | every RightCapital chart type (stacked columns, area range, donut, sankey, solid gauge); the accessibility and pattern-fill modules serve the colour-blind law; free for personal non-commercial use, which B9 is |
| Tables | TanStack Table | headless: grouped headers, sticky Year/Age column, drill state; adds no styles |
| Icons | lucide-react | plain SVG |
| Font | `@fontsource-variable/figtree` | self-hosted |
| Kept | React 19, Vite 8, `motion`, the strict CSP header, comlink, idb | unchanged |

**Rejected** (each breaks `style-src 'self'` without a nonce, and B9's static build cannot mint one): shadcn on Radix
(`react-remove-scroll` injects a `<style>`), Mantine, MUI, Ant Design; ECharts (tooltip HTML with inline `style`);
Tremor (stale, React 18 only). **Recharts** is the fallback if Highcharts' licence or styled mode ever bites.

**The three CSP fixes on day one:**
1. Wrap the app in `<CSPProvider disableStyleElements>` and add the two-line `.base-ui-disable-scrollbar` rule to our CSS.
2. Never add shadcn's `chart` component or `sonner` (both inject `<style>`); use Highcharts and Base UI Toast.
3. Set `styledMode: true` as a shared Highcharts default, import `highcharts/css/highcharts.css` plus B9's chart theme,
   and keep `useHTML` off for legends and tooltips.

**The one acceptance test before any screen:** a throwaway page with a Dialog, Select, ScrollArea, Toast, Slider, a
TanStack table and a Highcharts chart with the accessibility and pattern-fill modules, served through `pnpm verify:csp`.
Green proves the stack under the real header; a red names the library.

**What stays in `src/ui` and `src/viz`** (the words-and-numbers layer; the reason a reskin is affordable):
- `src/ui` and `src/ui/workbench` `.ts` (about 17,100 lines): `copy.ts`, `copyGuard.ts`, `entryCopy.ts`, `unlockCopy.ts`;
  `answerView.ts`, `recommendationView.ts`, `recommendationSaveView.ts`, `verdictSentence.ts`, `twoTier.ts`,
  `dateOdds.ts`, `dateSplit.ts`, `dateTradeoff.ts`, `outcomeStates.ts`, `assumptionRegistry.ts`, `stalenessExposure.ts`,
  `stateTaxDisclosure.ts`, `bandAnnotations.ts`, `noteParts.ts`, `money.ts`; the pure `*Chrome.ts` composers
  (`workbench/yearTableChrome.ts`, `factsChrome.ts`, `railChrome.ts` and the rest; ones tied to a retired surface shrink
  or go); app plumbing (`appModel.ts`, `scenarioFromDraft.ts`, `draftFromScenario.ts`, `vaultSession.ts`,
  `resultSave.ts`, `passphraseStrength.ts`, `updateGate.ts`, `unloadGuard.ts`, `devSeeds.ts`); `workbench/factRegistry.ts`,
  `tableRun.ts`, `whatIfRun.ts`; and their unit tests.
- `src/intake` `.ts` (about 5,600 lines): `intakeMap.ts`, `whatIf.ts`, `sanity.ts`, `otherIncome.ts`, `solveDispatch.ts`,
  `referenceData.ts`, the working-year left-over logic.
- `src/viz`: `bandData.ts` (the fan's input contract, becomes the area-range series), `curveMarks.ts` (the odds-ladder
  marks and clamps, becomes the "Odds by stop year" chart's marks), `palette.ts` (the canonical data colours and the CVD
  test), `scale.ts` (the lightness ramp).

**What is replaced:** every `.tsx` in `src/ui` and `src/ui/workbench` (about 9,800 lines) and in `src/intake` (about
8,200 lines: `flow.tsx`, `questions.tsx`, `AccountEntry.tsx` and the rest become Profile cards and drawers); all CSS
(`src/ui/styles`, about 3,500 lines; `src/intake/*.css`, about 1,800; the per-surface CSS in `src/viz` and
`workbench.css`), replaced by the theme file and the chart CSS; the SVG renderers (`ConfidenceBand.tsx`,
`OddsLadder.tsx`, `TwoFutures.tsx`, `RecommendationViz.tsx`, `BandLegend.tsx`, `BandEnlargeModal.tsx`,
`ConfidenceBandPanel.tsx`) with their pixel maths (`bandGeometry.ts`, `oddsLadderGeometry.ts`, `chartText.tsx`,
`chartText.css`). Old surfaces are deleted as their replacement lands, never archived.

**Unchanged:** `src/engine`, `src/crypto`, `src/store`, `src/shared`, `src/budget`, the worker pool, the CSP header.

**Landmines the rebuild walks into:**
- **The chart-text gates** (`e2e/chart-text.spec.ts`, `e2e/chart-text-rv.spec.ts`, `src/viz/chartText.tsx`) are written
  around the hand-rolled label overlays. Highcharts draws its own text; those arms are rewritten against the new DOM or
  retired with their charts, in the same commit that retires each chart.
- **The vertical-fit gate** (`e2e/vertical-fit.spec.ts`) measures today's surfaces; each new screen either holds one frame
  at 1440 × 731 in compact mode (3.6) or is declared a scrolling page. Decide per screen when it is built.
- **The CSP gate** asserts the workbench room loads violation-free; Highcharts' accessibility module adds hidden
  screen-reader nodes: check them under `verify:csp` before relying on it.
- **The band's honesty rules** (a linear `$0`-anchored axis, a lightness-ordered fan, in-place percentile text, the
  thinning cohort) carry over as chart config and CSS; they are rules about what is drawn, not which library draws it.
- **Copied shadcn code is ours**; upgrades are manual. Fine for a personal app.

---

## 6. The screen list, mapped to the engine

**Have** = the engine emits what the screen draws today. **Compose** = the data is emitted; a composer or a ledger run
is new UI-side work. **Missing** = an engine or schema gap, named by the map's row or unit.

| # | Screen | What it draws | B9 engine output today | Status | Missing |
|---|---|---|---|---|---|
| 1 | Shell, page frame, drawer, tray, tables, chart theme | the kit (2.0) | none needed | build first | |
| 2 | Retirement → Analysis → Probability | two rings, median bars, the answer line, odds by stop year | `Headline.xOfTen` + `outcomeState`; `terminalValuesReal`; `DateSearchOutcome` (`curve`, both tracks, grades); `SurvivorReading`; `floorReading` | Have | none |
| 3 | Action Items tray + plan list | eight lever rows, Refresh, kept what-ifs | `applyBundle`, `whatIfRun.ts` (U14, built), schema v6 kept what-ifs (U9, built), `railChrome.ts` (U15, in progress) | Have / Compose | apply-to-plan for each kind (U16) |
| 4 | Analysis → Confidence | fan, stop marker, run-out share, thinning | `BandFan.byYear` (p10–p90, `cohortFraction`), `DateBand`, `depletionYears` | Have | p5/p95 not computed (label 10–90 honestly; not needed) |
| 5 | Profile: stepper, six card grids, drawers | entry | the draft and `src/intake` validation | Have (UI new) | bank accounts (U10), inherited IRA (U11–U13), debts and fixed payments, property, repeating goals (U18), one-time inflows, LTC, pay raises (map §1 rows) |
| 6 | Profile → Net Worth | master-detail | entered accounts by kind and owner | Have | Bank, Loan, Property kinds (same rows) |
| 7 | Retirement → Cash Flows: Summary, Accounts, Invested Assets | year-by-year tables, Steady and Rough | `ledgerRows` (`LedgerYearRow`) via `tableRun.ts`; `yearTableChrome.ts` | Have (built U2–U7; reskin) | federal / state / FICA split of tax; portfolio-return dollars per year; net worth beyond invested money |
| 8 | Tax → Tax Strategies: Strategies, Summary | Winner card, ranked table, grouped bars | `SolveRecommendation` (winner, runner-up, no-change baseline, ranked ids, pruned scores, grade, named driver, skew), `TaxAwareWire` lifetime tax and terminal buckets | Have (ahead of RightCapital) | |
| 9 | Tax Strategies: Comparison, Details | yearly tax, conversions, withdrawals by bucket, Medicare premium | ledger runs of the winner's and baseline's levers on Steady (`roth` + `withdrawal-order` through the what-if runner); `conversion`, `draw`, `rmd`, `premiums`, `irmaaIncome` | Compose | per-year federal tax and bracket (map gap 10) |
| 10 | Tax Strategies: Calibration | income vs bracket and IRMAA lines | `magiLandscape.ts` computes the lines; not emitted per year | Missing | U22 + the yearly yield U23 (map gap 6) |
| 11 | Dashboard → Snapshot | ring, stat rings, balance sheet, fan, recommendation | rows 2, 4, 8; withdrawal rate from a ledger row | Have / Compose | effective federal tax rate per year (gap 10) |
| 12 | Dashboard → Balance Sheet | assets, debts, net worth bars | entered accounts | Have | debts and property (row 5) |
| 13 | Analysis → Comparisons | plan vs what-if over time, Steady / Rough picker | ledger rows of plan and what-if (`tableRun.ts`, `whatIfRun.ts`) | Compose | more named scenarios (flat 0%, a crash in year 1): new named futures, S |
| 14 | Analysis → Retirement Details | income sources, withdrawal rate, spending, comparisons | ledger: `socialSecurity`, `otherIncomeByPerson`, `draw`, `hsaSpend`, `spending`, `taxPaid`, `premiums`, `ranOut` | Compose | guardrail and floor-and-ceiling charts (map gap 9) |
| 15 | Analysis → Savings | deposits, savings rate | `contribution`, `LedgerWorkingYear` | Compose | portfolio-return dollars (row 7) |
| 16 | Retirement → Health Care: Cost Analysis | yearly cost stack, totals | `HealthReadout.byYear`, lifetime premium and Medicare totals | Have (ahead: ACA years and the cliff) | per-person split (readout is household medians) |
| 17 | Investment → Asset Allocation, Tax Allocation | current vs target mix, bucket donut | entered mixes and balances; `mix` lever | Have | Allocation Path (a mix over time, M); Holdings (U20) |
| 18 | Settings + Display drawer | assumptions with live sentences | `assumptionRegistry.ts` | Have | a future-dollars view (check `priceIndex.ts`) |
| 19 | Profile → Blueprint | household picture | the draft | Have | |
| 20 | Retirement → Social Security | claim strategies, break-even | `claim-age` lever on the runner; ledger `socialSecurity` | Compose | the "optimal" claim search, L (map gap 7) |
| 21 | Retirement → Stress Test | odds per shock, combined | none in the app (`historical.ts` is validation only) | Missing | fixed shocks on the shared draw (map gap 8) |
| 22 | Cash Flows → Maps | Sankey for one year, year pin | one ledger row | Compose | build after row 7 |
| 23 | Tax → Tax Estimate | effective rate stack, 1040 | `taxPaid` combined | Missing | per-year federal / state / payroll split, bracket, the 1040 (map gap 10) |

**Build order.** The 2026-11-24 ruling puts the UI first; the map's engine-gap order continues after it, each gap landing
as its RightCapital screen. Workbench units still open in gap 2 (U15 the rail, U16, U25 the workspace home) are built in
the new kit as rows 3 and 11, not in the old CSS.

1. The stack, the theme file, the CSP acceptance page, then the kit (row 1).
2. Retirement → Analysis: Probability, the Action Items tray and plan list, Confidence (rows 2–4). This is the calm
   answer and the what-ifs; it replaces the result screen and the workbench room.
3. Profile and the first-run stepper (rows 5, 6). The whole path from empty is then new; the old intake screens are
   deleted.
4. Cash Flows (row 7).
5. Tax Strategies: Strategies, Summary, Comparison, Details (rows 8, 9). It replaces the recommendation surface.
6. Snapshot as home, Balance Sheet (rows 11, 12).
7. Comparisons, Retirement Details, Savings (rows 13–15).
8. Health Care, Investment, Settings (rows 16–18).
9. Blueprint (row 19).
10. Then the map's gaps in its ruled order, each with its screen: Calibration (gap 6), Social Security (gap 7), Stress
    Test (gap 8), Tax Estimate (gap 10), Maps, Holdings.

---

## 7. The "impeccable" skill verdict

**Do not install it. No new design skill is needed.** (`reports/tooling.md` §3, read file by file from
`github.com/pbakaus/impeccable`, 115,754 stars, Apache 2.0, plugin 4.10.0.)

Why not, concretely:
1. **It stops to ask.** Its new-work flow shows three directions and "stop[s] and wait[s]" for the user to pick, with no
   skip. That is the exact pattern Briggsy called out on 2026-11-24.
2. **It can launch a non-Claude tool.** Live mode's Apply falls back to the `codex` CLI with approvals and sandboxing off.
   Briggsy's rule: Claude models only.
3. **Hooks on every edit and every turn end** run a downloaded Rust binary (checksum-verified, not malicious) and inject
   findings into context: process on top of B9's own gates.
4. **Its taste rules fight a clone.** Its refuse list bans things RightCapital's screens use: the big number with a small
   label, rounded summary cards, progress rings.
5. **Telemetry** to impeccable.style for design "rolls" (opt-out exists).

What it does well can be had without installing it: if a mechanical sweep is wanted once screens exist, run its detector
once from the terminal with telemetry off (`IMPECCABLE_NO_TELEMETRY=1 npx impeccable detect --json` against `src/` and the
dev server), read the findings, fix the real ones. Its "browser surfaces" reminder (selection colour, caret, scrollbars,
focus rings, tabular numerals) is worth a few lines in `back-nine-design`.

**The skills for the rebuild:**
- **The screenshots and this doc outrank `frontend-design`.** For a clone the direction is RightCapital's screens;
  `frontend-design`'s job shrinks to nothing.
- **`back-nine-design` still outranks everything** on colour-blind encoding, chart honesty and CSP. Its stale rules,
  written for the old surfaces, are updated in the same pass as the first build: the chrome palette becomes 3.1's tokens;
  the data palette law becomes "RightCapital's series hues, each categorical pair measured against the 0.10 CVD floor or
  listed as carried by its second cue" (in place of "Okabe–Ito only, at most two accents"); the band's hue moves to about
  272 under the same lightness law; "the band is never on the verdict's first frame" goes (RightCapital's Snapshot puts
  the ring and the fan side by side, under the 2026-11-22 workspace ruling); Fraunces and the cream paper go.
- **`dataviz`** (in the harness) is loaded for every chart, under B9's colour law.
- **`emil-design-eng`** for the morph timing; **`web-design-guidelines`** as the post-build review.

---

## Where this comes from

Six research lanes ran on 2026-11-24. Each wrote a full report beside its screenshots in
`C:/Users/brigg/.claude/projects/C--users-brigg-ai-learning-journey-projects-the-back-nine/b9-ui-research/reports/`:

| Report | Screens looked at | Covers | Main sources |
|---|---|---|---|
| `rc-shell.md` | 64 | the shell, Snapshot, Profile and data entry, Blueprint, settings, the client and advisor portals | help.rightcapital.com articles, rightcapital.com product SVGs, Vimeo how-to frames |
| `rc-analysis.md` | 55 (plus about 150 frames on contact sheets) | Retirement Analysis, Action Items, plan lists, Stress Test, Social Security, Health Care, Iris Plan Builder | help.rightcapital.com (including recordings played frame by frame), the RightCapital blog |
| `rc-cashflow-tax.md` | 77 of 358 saved | Cash Flows, Tax Estimate, Tax Strategies, Tax Analyzer, Investment, Insurance, Estate, the mobile app, the design tokens | help.rightcapital.com via its sitemap, rightcapital.com renders, the site CSS and press kit |
| `diy.md` | 66 | ProjectionLab (v5, 2026-11-20), Boldin, MaxiFi, Pralana, Empower, TPAW | vendor blogs and help centers, YouTube storyboards, a Can I Retire Yet? review |
| `advisor.md` | 72 | eMoney, MoneyGuide, Income Lab, Holistiplan, Asset-Map | vendor pages, help-center feeds and CDNs |
| `tooling.md` | 0 | RightCapital's shipped stack, component and chart libraries under B9's CSP, impeccable | app.rightcapital.com CSS and HTML, npm, vendor sources and issue trackers |

The synthesis opened these screens itself to check the reports: the Probability, Action Items, Confidence, Retirement
Details, Stress Test, Social Security break-even and Health Care screens; Cash Flows Summary and Maps; Tax Strategies
Summary, Calibration, Strategies and its calculating state; Snapshot; the stepper, the salary drawer and Net Worth; the
Blueprint render; ProjectionLab's optimizer and Income Lab's guardrail dashboard. The colour and contrast figures in 3.3
and 3.4 were measured for this doc with culori 4.0.2 (B9's own pinned metric); the font check in 3.5 read the Google Fonts
TTFs. B9's outputs in section 6 were read in the code the same day (`src/shared/model.ts`, `src/engine/engineWire.ts`,
`src/engine/solver/solve.ts`, `src/engine/simulate.ts`, `src/ui/workbench/*`).
