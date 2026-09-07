<!-- Produced 2026-09-06 23:00 to 2026-09-07 00:25 ET by a 93-agent workflow (8 roster graders, 4 sourced news
sweeps, a projection-vs-board reconciler, a schedule analyst, 4 trade designers, a waiver planner, a beat-Hunter
strategist, 3 adversarial judges per proposal, a writer, a critic, a reviser). Data: temp/league_dump.{md,json}
(Sleeper rosters, weekly + season projections, schedule, injury tags, our board), pulled 22:00 ET on draft night.
Pilot verification 2026-09-07 morning, against the dump and the live API:
  - byes: Maye 11, Fannin 11, Bates 6, Vikings 6, Taylor 13, Flowers 13 -- CONFIRMED
  - Hunter's worst optimal week is 8 (135.7) and it is against us (138.2) -- CONFIRMED
  - every team plays every other exactly twice in weeks 1-14; weeks 15-17 repeat weeks 1-3 -- CONFIRMED
  - Kaeperni dropped Mark Andrews 22:02 for the Steelers DEF -- CONFIRMED in /transactions/1
  - the 14 named free-agent targets were all still unowned at 08:00 ET 2026-09-07 -- CONFIRMED
  - CORRECTION: section 1 quotes "9-8, margin -13.4" over 17 weeks. Over the 14 REAL regular-season weeks,
    optimal-vs-optimal reads 8-6 with a cumulative margin of -8.3 (pilot recomputation from the dump).
  - the 22 killed trades are listed with the judges' reasons in section 5(d); the two "waiver plan" entries in the
    kill file were routed through the trade judges by the pilot's script, not rejected on merit -- section 5(a) is
    the waiver plan and it stands. -->
# Family Feud 2026: Season Outlook
**PoppaBriggsy (roster 3, "Saquon Deez Nuts") | Written Sun 2026-09-06, ~23:00 ET | Week 1 kicks Wed 2026-09-09**

---

## Read this first: the glossary

Every symbol and shorthand used below, spelled out once.

| Term | What it means |
|---|---|
| **r##** | Our board's overall rank out of roughly 180 ranked players. "r73" = 73rd overall on our board. |
| **T#** | Tier. Our board's grouping of players it cannot meaningfully separate. T1 is the top group. |
| **VORP** | Value over replacement player. How much better a player is than the best guy sitting in free agency at his position. |
| **PPR** | Points per reception. Our scoring: 1.0 point per catch, no tight-end bonus. |
| **FLEX** | A lineup slot that accepts a running back, receiver or tight end. |
| **WR1 / WR2 / RB2 / QB2 / TE2 / FLEX2** | The Nth-best player at that position on a given roster, or the Nth lineup slot. "QB2" is a backup quarterback. "WR1" is a team's best receiver. |
| **Optimal lineup** | The best legal ten you could have started that week if you knew the projections in advance. A comparison scale, not a forecast. |
| **Streaming** | Renting a kicker or defense for one week instead of rostering a permanent backup. |
| **Handcuff** | The backup to somebody's starting running back. |
| **ADP** | Average draft position. What the wider market paid for a player. |
| **Spearman** | A rank-agreement score where 1.0 means two lists order players identically and 0 means no relationship at all. |
| **Implied team total** | The points a betting line expects one team to score, computed from the spread and the over/under. |
| **playoff_seed_type** | The league's re-seeding switch. Ours reads `1`, which we believe means re-seeding is on. |

**The standing caveat on every number in this report.** Our board overstates the top of every position by roughly a factor of two (insight 023, measured four positions for four). Sleeper's projections are one vendor's guess with no published error bars, and its weekly numbers are the season total divided by games, not a matchup read (median week-to-week swing across 113 rostered players: 0.70 points). **Read every figure below as an ordering, not a margin.** Where I quote a decimal it is so the arithmetic is auditable, not because the decimal is real.

**One data warning that matters tonight.** `league_dump.json` was generated at 22:00 ET and is one transaction stale. Kaeperni dropped Mark Andrews at 22:02:39. Any roster claim sourced to the dump is 22:00 truth.

---

## 1. The verdict in five lines

1. **We finished the draft first of eight in talent and sixth of eight in output.** Our board has us at 1147 VORP, the most in the league. Sleeper has our best-lineup season total sixth of eight. Best assets, worst construction. On optimal-versus-optimal our schedule projects **9-8 with a cumulative margin of -13.4**; stream-adjusted through Week 14 it reads **9-5**. Both are deterministic orderings, not forecasts.
2. **Hunter finished first of eight in output, first in the playoff weeks, and holds the highest floor in the league.** His worst week is 135.7 against a field whose bottoms run 107.8 to 135.6. Stream-adjusted he projects **13-1**. Our board has him fifth. Breadth, no alpha.
3. **The one structural problem: we roster exactly one quarterback and exactly one tight end, and Drake Maye and Harold Fannin share a Week 11 bye.** Week 11 fields two literal zeros and collapses to 107.8, the worst single week any team in this league posts all season.
4. **The one move this week: drop Kenny Gainwell for a quarterback whose bye is not Week 11, and drop Michael Pittman for a tight end whose bye is not Week 11.** Both are instant free-agent adds tonight and cost zero waiver priority. Week 11 goes from two empty slots to two filled ones.
5. **How we beat Hunter: we do not out-roster this league, we out-time it.** Every team plays every other team exactly twice in Weeks 1-14, so all strength-of-schedule difference is bye timing, and we own the easiest stream-adjusted schedule and the luckiest bye timing in the room. We are fifth of eight on talent and first of eight on schedule.

---

## 2. Power rankings, all eight

Two instruments, shown side by side. Sleeper's number is the best-lineup season total. Our board's number is the sum of every rostered player's VORP.

| # | Team (roster) | Grade | Sleeper optimal (rank) | Board VORP (rank) | Why |
|---|---|---|---|---|---|
| 1 | **briggsy007 / HUNTER** (1) | A | 2508.1 (1st) | 985 (5th) | Best RB pair in the league and the No. 2 tight end. Worst WR1 of eight. Cleanest bye map anyone owns. |
| 2 | **RMonk9** (2) | A- | 2425.0 (3rd) | 1019 (3rd) | Gibbs and Bowers at the top, worst WR2 and worst DEF slot at the bottom. One QB, one TE, both bye Week 13. |
| 3 | **BuschLight420** (6) | B+ | 2437.2 (2nd) | 1088 (2nd) | Best receiving corps in the league. About 36 points of that total belongs to Josh Jacobs, who cannot legally play. Honest total 2401.1, which is fourth. |
| 4 | **PoppaBriggsy / US** (3) | B | 2378.1 (6th) | 1147 (1st) | Most talent, worst build, largest recoverable hole in the league. Filling our empty slots off the wire ranks ahead of every other team's patch. |
| 5 | **kblizzy23** (7) | B- | 2420.4 (4th) | 955 (6th) | Elite top four. Dead-last RB slot and dead-last FLEX. Spent picks 26, 58 and 87 on the first QB, the first DEF and the second K. |
| 6 | **MattiICE23** (4) | C+ | 2381.4 (5th) | 921 (7th) | Puka Nacua anchors a real WR room. Weeks 10 and 11 are a three-way and a five-way bye collision with no backup QB, DEF or K. |
| 7 | **Kaeperni** (5) | C+ | 2366.6 (7th) | 1004 (4th) | Bijan Robinson plus the best-funded kicker and defense in the room. Last in the league at WR plus FLEX combined. |
| 8 | **Cltchiefs** (8) | D+ | 2361.2 (8th) | 843 (8th) | Ten straight RB and WR picks, then a defense at 88 and his first tight end at 105. Flattest roster in the league, last in the playoff weeks. |

**Which source to believe, and for what.**

- **Believe Sleeper's optimal for "will this roster score."** It is a lineup metric, and lineups win weeks. Use it for seeding questions.
- **Believe our board's VORP for "did we draft well" and for trade value.** A trade exchanges roster slots, so what matters is what replaces the player you send out. Replacement level is exactly what a raw projection cannot see. Sleeper ranks **D'Andre Swift** and Hunter's **Jameson Williams** about level; VORP ranks Swift well ahead, because the best free running back is much worse than the best free receiver.
- **Believe neither as a margin.** See the standing caveat above.
- **They are not two opinions.** Player-level agreement between them is Spearman 0.973 — that is, they order individual players almost identically. Our board IS FantasyPros full-PPR consensus since 2026-08-08, and Sleeper is one vendor reading the same market. Two agreeing instruments here is one instrument counted twice. At the team level they correlate only 0.310, and that gap is entirely about what each one sums, not about which players are good.
- **The tiebreaker that settles it:** let every team fill its own empty lineup slots off the waiver wire and the ordering becomes Hunter, RMonk9, BuschLight420, **US**, kblizzy23, MattiICE23, Kaeperni, Cltchiefs. Fourth, and closing.

### The zero-slot ledger, whole league

A "zero" is a required lineup slot with nobody eligible to fill it, which Sleeper scores as a literal 0.0. Every one is fixable off the wire. **Read this table before believing any projected blowout in section 6.**

| Team | Zeros | Where | Season cost |
|---|---|---|---|
| **US** | 4 | W6 K, W6 DEF, W11 QB, W11 TE | 46.3 — the worst in the league |
| RMonk9 | 4 | W7 DEF, W13 QB (Lamar) + W13 TE (Bowers) | Week 13 falls to 108.6 |
| MattiICE23 | 3 | W10 QB + W10 DEF, W11 K | Week 10 falls to 111.6 |
| Kaeperni | 3 | W8 K, W10 QB, W10 DEF | Week 10 falls to 112.7 |
| **HUNTER** | 2 | W11 K (Myers), W13 DEF (Ravens) | 15.3 |
| BuschLight420 | 2 | W7 K (Cam Little), W8 DEF (Texans) | W8 margin is smaller than the zero |
| kblizzy23 | 2 | W7 K (Dicker), W11 DEF (Rams) | Week 11 falls to 124.6 |
| Cltchiefs | 2 | W5 K (Butker), W11 DEF (Seahawks) | Week 5 and Week 11 |

Any week where an opponent's projection craters, check this table first. Four of the eight collapses above are bookkeeping, not weakness, and one waiver claim erases each.

### The scoring rules that actually change player evaluation

Verified against the live `scoring_settings` tonight. Full PPR, 1.0 per reception, and the tight-end bonus key is **absent**, so there is no TE premium. Beyond that, three things worth knowing:

- **Six long-touchdown bonuses are present and they STACK.** `pass_td_40p 1` / `pass_td_50p 2` / `rush_td_40p 1` / `rush_td_50p 2` / `rec_td_40p 1` / `rec_td_50p 2`. A 55-yard receiving touchdown scores 6 + 1 + 2 = **9 points**. **No projection in this dump models it.** It rewards big-play profiles (Jameson Williams, Xavier Worthy, Zay Flowers) over volume-only receivers, and it is the one scoring rule in this league that should nudge a close start/sit call.
- **The defense object carries 12 scoring keys, not the 7 our own `league.md` lists** — `def_td`, `def_st_td`, `st_td`, `sack`, `int`, `fum_rec`, `def_st_fum_rec`, `st_fum_rec`, `ff`, `def_st_ff`, `st_ff`, `blk_kick`, `safe`. Individual-defender and return-man scoring reaches us only through the team unit.
- **`league_average_match` is 0.** There is no median game. Fourteen head-to-head results are the entire regular season, so a bad week is a full loss and there is no second bite.

---

## 3. Our roster

### Starters

| Slot | Player | Team | Sleeper season | Board | Bye | Wk 1 | The honest read |
|---|---|---|---|---|---|---|---|
| QB | Drake Maye | NE | 320.76 | r37 T2 | **11** | 21.4 | The third quarterback taken, at pick 43, inside the round-6-to-9 window the doctrine endorses. Our only quarterback. |
| RB | Jonathan Taylor | IND | 272.30 | r10 T2 | **13** | 19.6 | Cleanest asset we own. No designation, no preseason snaps by choice. |
| RB | Chase Brown | CIN | 255.20 | r15 T3 | 6 | 16.8 | Best RB2 in the league. 69 catches in 2025 is exactly what full PPR pays for. |
| WR | Nico Collins | HOU | 262.00 | r14 T4 | 8 | 17.4 | Fifth-best WR1 of eight, but the safest start on the roster. |
| WR | Drake London | ATL | 250.20 | r11 T4 | **11** | 15.8 | Healthy. His quarterback is undecided. See below. |
| TE | Harold Fannin Jr. | CLE | 180.40 | r73 T3 | **11** | 11.6 | Seventh-best of eight starting tight ends. Our only tight end. |
| FLEX | Zay Flowers | BAL | 228.20 | r29 T5 | **13** | 15.6 | Second-best FLEX in the league. Carrying a designation. |
| FLEX | D'Andre Swift | CHI | 208.00 | r50 T5 | 10 | 13.7 | Weakest second FLEX of eight. Carrying a designation. |
| K | Jake Bates | DET | 105.00 | r175 T3 | **6** | 7.2 | Only negative-VORP player on our active roster, but Detroit posted the second-highest implied team total of Week 1 (28.25, computed from the DET -7 / 49.5 line). Start him. |
| DEF | Vikings | MIN | 92.00 | r159 T2 | **6** | 7.3 | Tied for the **best free-agent defense available**. Among the eight rostered starting defenses ours ranks seventh: Rams 106 (kblizzy23), Texans 104 (BuschLight420), Seahawks 103 (Cltchiefs), Eagles 98 (MattiICE23), Broncos 96 (Kaeperni), Ravens 95 (Hunter), Vikings 92, Jaguars 91 (RMonk9). |

### Bench and IR

| Player | Team | Sleeper | Board | Bye | Read |
|---|---|---|---|---|---|
| Rome Odunze | CHI | 207.9 | r59 T6 | 10 | Our best trade chip and our bye cover in Weeks 6, 8, 11 and 13. Questionable (right leg). |
| Rhamondre Stevenson | NE | 169.0 | r70 T6 | **11** | The most underpriced player we own tonight. Do not trade him. |
| Chris Godwin | TB | 173.6 | r71 T6 | 10 | Starts in zero of 17 weeks on paper, but he is our only spare receiver in Week 8. Do not drop before Week 8. |
| Michael Pittman Jr. | PIT | 170.9 | r80 T7 | 9 | Zero optimal starts. New team, 42-year-old QB, no preseason reps, soft-tissue injury, listed second behind Metcalf. **The drop.** |
| Tony Pollard | TEN | 160.1 | r81 T6 | 9 | Zero optimal starts, but healthy, untagged, and the confirmed lead back in Tennessee. He is our Swift insurance. |
| Kenny Gainwell | TB | 152.3 | r94 T7 | 10 | Zero optimal starts, lowest board rank on the active roster, and his handcuff value protects BuschLight420's Bucky Irving, not us. **The drop.** |
| Tank Dell (IR) | HOU | 51.9 | r146 T8 | 8 | Correctly parked. Costs no roster space. Torn ACL and MCL with surgery, and he took roughly a 53% pay cut on 2026-09-04 ($3.624M scheduled down to just over $1.7M), which is Houston's own estimate of his 2026 value. |

### The four live questions, with sources

- **Zay Flowers** (WR, BAL). Sleeper says "Questionable / Undisclosed," ESPN says "lower body," a grounded search says "quad contusion." He returned to practice Thu 2026-09-03 per Cordell Woodland of 105.7 The Fan (via the ESPN injuries API, feed timestamp 2026-09-07 02:06 UTC). **There is no official game designation yet.** Baltimore's first Week 1 injury report is due Wed 2026-09-09. Read as playing, verify Wednesday.
- **D'Andre Swift** (RB, CHI). Left Thursday 2026-09-03 practice in visible discomfort; Adam Schefter reported it is believed to be a cramp, not a strain (ESPN note dated 2026-09-04 00:32 UTC). No official diagnosis. His backup **Kyle Monangai** is week-to-week with a hyperextended knee since 2026-08-16 and I could find no report of him practising with the team, which argues Swift's workload goes up, not down, if he plays. Bears report due Wed 2026-09-09.
- **Rome Odunze** (WR, CHI). Exited the same 2026-09-03 practice with a right-leg issue. Dan Wiederer of the Chicago Tribune reports he "should be all good" (ESPN note 2026-09-03 22:57 UTC). Unrelated to the 2025 left-foot stress fracture. Both of our Chicago players were hurt at the same practice; that is a correlated risk worth naming.
- **Drake London** (WR, ATL). Healthy, no tag. **The risk is entirely his quarterback.** Atlanta is reported as the only NFL team without a declared Week 1 starter, with an announcement expected at a press conference Wed 2026-09-09. Tua Tagovailoa (one-year minimum deal, struggled in preseason, reported to be on a short leash if he starts) against Michael Penix Jr. (ACL tear in Week 11 of 2025, cleared for 11-on-11, beat writers see him as the long-term answer). ESPN's own note ties London's output directly to which one plays.

**One piece of news cuts in our favor, and Sleeper has not caught up to it.** The Patriots' first official Week 1 injury report, from Sunday 2026-09-06 practice, lists **TreVeyon Henderson** (ankle) as one of three non-participants; he has not practised since 2026-08-24. That official report is the primary source, and three outlets carried four items off it tonight: Pro Football Talk (2026-09-06 20:06 ET), Yahoo/USA TODAY (19:40 and 20:01 UTC) and Rotowire (11:11 PDT). Yahoo projects **Rhamondre Stevenson** for 25 to 30 touches as "a low-end RB1 or top-tier RB2," and notes the only other active back on New England's 53 is first-year Corey Kiner, with Terrell Jennings on season-ending IR. Sleeper's Week 1 projection of 11.8 was set before Sunday's report and is stale to the low side. Henderson belongs to **MattiICE23**, whom we play in Weeks 5 and 12.

### Three board corrections surfaced tonight

Our own board carries stale or wrong notes on four players. Fix them before they cost a lineup decision.

- **Xavier Worthy** (KC, board r124) is ranked on a note reading "Sprained shoulder in camp on top of sophomore-slump worry." That is stale. ESPN lists him Active with no designation (row updated 2026-08-29), Andy Reid said he had a "nice camp," and he is expected to carry a full route tree for the first time. He is KC's Z receiver in a Mahomes offense.
- **Rachaad White**'s board note says he is "competing for Washington's starting job." He **lost** it. Jacory Croskey-Merritt is the early-down and goal-line back; White is the passing-down back — which in full PPR is still the better floor, and which changes the Week 8 blocking arithmetic below.
- **Oronde Gadsden** (LAC, board r145, note "Year 2 buzz in LA") is a **fade**. Sleeper's depth chart says TE1, but camp reporting has him working with the backup quarterbacks behind Charlie Kolar and David Njoku, he is the No. 6 most-dropped player in fantasy tonight, and Sleeper's own weekly projection of 4.84 contradicts Sleeper's own depth chart. Do not be tempted by his season number.
- **Marvin Harrison Jr.** — our board's "camp yips" note could not be confirmed or refuted tonight. Every source found attributes his 12-game 2025 to a concussion, an appendectomy and heel injuries. Do not repeat the yips line as fact.

### The bye-week problem, spelled out by name

The standing framing has been "Weeks 10, 11 and 13." **The data says that is wrong in one place and misses another.**

| Week | Out | Optimal | Verdict |
|---|---|---|---|
| **6** | **Jake Bates** (K, DET), **Vikings** (DEF, MIN), **Chase Brown** (RB, CIN) | 123.8 | **The missed week.** Our only kicker and our only defense bye together, so the lineup books two literal zeros. Chase Brown is absorbed cleanly by Odunze. Opponent BuschLight420 at 135.6, which is their worst week of the season. |
| **10** | **Rome Odunze** (CHI), **Chris Godwin** (TB), **D'Andre Swift** (CHI), **Kenny Gainwell** (TB) | 142.8 | **Nearly free.** Four bodies out, only one starter, and Stevenson covers. Down 1.8 from a clean week. This is the week our deep bench pays for itself. |
| **11** | **Drake Maye** (QB, NE), **Harold Fannin** (TE, CLE), **Drake London** (WR, ATL), **Rhamondre Stevenson** (RB, NE) | **107.8** | **The catastrophe, and it is the fixable one.** The QB slot reads 0.0 and the TE slot reads 0.0 because we roster one of each. Of the 36.8-point drop, 31.5 is two empty slots. Opponent RMonk9 at 145.3. Also the trade deadline week. |
| **13** | **Jonathan Taylor** (RB, IND), **Zay Flowers** (WR, BAL) | 132.5 | **The one nothing fixes.** No empty slot. The replacements (Odunze, Stevenson) are simply worse players than a starting RB1 and a starting FLEX. Opponent BuschLight420 at 140.6, in the second-to-last seeding week. |

Our real damaging cluster is **6, 11 and 13**. Weeks 6 and 11 are bookkeeping errors we can erase this week. Week 13 is the only one that requires a trade, and the deadline for that trade is Week 11.

---

## 4. Hunter's roster

### His ten

| Slot | Player | Team | Sleeper season | Board | Bye | Per-week |
|---|---|---|---|---|---|---|
| QB | Jayden Daniels | WAS | 308.72 | r55 T3 | 7 | 21.11 |
| RB | Christian McCaffrey | SF | 291.0 | r9 T2 | **8** | 22.21 |
| RB | De'Von Achane | MIA | 257.4 | r20 T4 | 6 | 17.31 |
| WR | Tee Higgins | CIN | 224.4 | r36 T6 | 6 | 15.51 |
| WR | DeVonta Smith | PHI | 229.2 | r21 T5 | 10 | 15.00 |
| TE | Trey McBride | ARI | 234.9 | r17 T1 | 14 | 15.67 |
| FLEX | David Montgomery | HOU | 206.1 | r61 T6 | **8** | 14.20 |
| FLEX | Jameson Williams | DET | 206.2 | r51 T6 | 6 | 14.01 |
| K | Jason Myers | SEA | 111.0 | r168 T2 | 11 | 7.74 |
| DEF | Ravens | BAL | 95.0 | r166 T3 | 13 | 7.53 |

Bench: **Patrick Mahomes** (pick 67, board r100, negative VORP, Questionable / knee-ACL), **Travis Kelce** (pick 94, r93), **Garrett Wilson** (pick 46, r30), **Marvin Harrison Jr.** (pick 78, r67), **Jacory Croskey-Merritt** (pick 110, r112), **Makai Lemon** (pick 99, r106). **Both IR slots are empty**, so every waiver add costs him a live body.

### Exploitable weaknesses

1. **Worst WR1 in the league, and it is trade-only.** Tee Higgins at 15.51 a week is eighth of eight among starting WR1s. Six receivers, no alpha. The best free-agent skill player by weekly average is Jalen Coker at 11.87, which is below Hunter's own WR4. He must trade for a receiver or go without, and he has zero recorded trades in 2025 across two leagues.
2. **Five of sixteen roster spots do almost nothing.** Mahomes starts 2 of 17 weeks and Kelce starts 2 of 17. Marvin Harrison, Makai Lemon and Croskey-Merritt add nothing to any other roster in this league. With both IR slots empty, that is where the cost of any waiver move lands.
3. **A free agent beats both his quarterbacks.** **Brock Purdy** (unrostered, 303.2 season, 22.09 a week) projects ahead of Daniels (21.11) and Mahomes (20.60). Claiming Purdy would be a real gain for him. He spent picks 67 and 83 on quarterbacks — see the doctrine box below for why that is the mistake.
4. **Measured inactivity, and this is the load-bearing read.** Counting completed transactions per roster across five historical seasons in two rooms (three years of the 8-team Fantasy Fuccbois, two of AM Lumber, all pulled tonight): median 10 moves a season, ranked 7/8, 8/8, 7/8, 9/10 and 8/12. Bottom two every single season. Four trades in five seasons and zero in 2025 in both leagues. One of one hundred FAAB dollars spent in the only auction-waiver league he played. **Caveat that matters:** three of those five seasons are the same room in consecutive years, so the independent-room count is two, not five, and this has never been cross-validated the way his failed draft profiles were. It is descriptive.
5. **Running back cliff with no wire repair.** His RB weekly averages run 22.21 / 17.31 / 14.20 / 8.98. Best free-agent back by weekly average is Rachaad White at 10.11.
6. **Two forfeited slots.** One kicker (Myers, bye 11) and one defense (Ravens, bye 13), so his model books a zero in each of those weeks.
7. **Concentration at the top.** McCaffrey is roughly one seventh of his season total (355.3 of 2508.1), at age 30 off a 450-touch year. Verified tonight that he plays Week 1: the 49ers reported no injuries on their Week 1 report, the August absence was pre-planned load management, and he returned to team drills 2026-09-02 (nfl.com, 49erswebzone.com, footballnationusa.com, rotowire.com, all 2026-09-06). His only backup, **Kaelon Black**, is unrostered by anybody in this league.
8. **His first points of the season come from his shakiest asset.** Jason Myers kicks in the season opener Wed 2026-09-09. He missed three of five field goals (two inside 50) and two of four extra points this preseason, is the only kicker on Seattle's roster, and reporting says the team could look elsewhere if it continues (seahawks.com, si.com, 12thmanrising.com, rotowire.com, 2026-09-06).
9. **Do not plan around his draft profile.** His most confident measured tendency (first QB off the board, median second) broke tonight: he took QB6 at pick 67. Per insight 022 his personal position-by-round model scores worse than a constant that always guesses wide receiver. Descriptive, not predictive.
10. **Commissioner risk, which is a risk to us rather than a weakness of his.** He is the league owner. Sleeper documents that commissioners can manually modify playoff seeding on the bracket interface the week before the postseason (support article 2528718) and can recalculate weekly matchup points (article 4238872). A regular-season tie stays a tie in this league with no tiebreaker (article 5200797). **Be unambiguously ahead, not tied — and screenshot the standings at the close of Week 14, before the week in which a commissioner can hand-edit playoff seeding.**

> ### Doctrine box: why picks 67 and 83 on quarterbacks is the mistake
> **Four independent lines agree** that spending early capital on a quarterback in this room is wrong. Never "proven" — agreed.
> 1. **Insight 023's realised-value curve**, measured over eleven seasons: the preseason QB1 returned **10.2 VORP** against the board's stated 129.7. That is a 12.7x overstatement, against roughly 2.55x for RB1, 1.81x for WR1 and 1.77x for TE1. The QB curve is flat beneath QB12 by construction, and 11 of 12 QB cells are indistinguishable from replacement.
> 2. **The board's own arithmetic:** QB1 129.7 against RB1 268.4.
> 3. **The room's 2023 8-team results:** both seats that took a quarterback first finished 5th and 6th of 8.
> 4. **Insight 024's held-out QB-EARLY arm:** -49.8 ± 25.6, negative in 9 of 12 seasons.
>
> This is why our Drake Maye at pick 43 (round 6, the third quarterback taken) is a good outcome and Hunter's Mahomes at 67 is not — and why the correct answer to a Week 11 quarterback hole is a waiver claim, not a trade.

### Head-to-head: two games, not three

The dump pairs us with Hunter in Weeks 1, 8 and 15, **but Weeks 15 to 17 are a phantom.** The schedule is a seven-week round robin repeated: Week 15's matchup file is pairing-identical to Week 1's, Week 16 to Week 2, Week 17 to Week 3. Playoffs start Week 15, so the bracket overwrites those. **We play Hunter in Week 1 and Week 8, and nowhere else in the regular season.**

**WEEK 1 (146.4 to 147.7, a coin flip).**
- Both rosters full strength, no byes, nothing to stream. The gap is smaller than a single reception in full PPR.
- **The unusual part is the clock.** Three of our decisions are due Wednesday, not Sunday. NE at SEA kicks Wed 2026-09-09 8:20 p.m. ET and contains our **Drake Maye**, our **Rhamondre Stevenson**, and his **Jason Myers**. His **McCaffrey** plays Thursday 2026-09-10 8:35 p.m. ET in Melbourne. Everything else is Sunday.
- **On his likeliest lineup his week finishes Sunday afternoon.** Sleeper's optimal starts Daniels and McBride, not Mahomes and Kelce, so neither of us holds Monday-night leverage.
- **Sunday morning watch list:** Tee Higgins (heel contusion, CIN 1:00 p.m. ET; if he sits, Hunter's replacements are Marvin Harrison or Makai Lemon, a real step down, and the coin flip tips to us); our Flowers, Odunze, Swift, and Atlanta's quarterback announcement.
- **The one real lineup decision is our FLEX2.** See section 5(a).

**WEEK 8 (138.2 to 135.7). This is the game.**
- 135.7 is **the worst week of his season**, 14.3 below his own median, and **the only matchup on his entire 17-week line that his optimal lineup loses.**
- Cause: San Francisco and Houston bye in the same week, so **McCaffrey** and **Montgomery** are both out and his RB2 becomes **Jacory Croskey-Merritt** at 8.8.
- Our side: we lose **Nico Collins** to Houston's bye and cover with **Odunze**. No empty slot. This is why **Chris Godwin must not be dropped before Week 8.**
- **The vulnerability, and why we are not blocking it this week.** Two free agents repair his Week 8: **Rachaad White** (10.0 that week) and **Jalen Coker** (11.9 that week). Either closes more than our entire projected margin of 2.5 points, and he can claim either on any Wednesday between now and then. See the named fork in section 5(a).
- **Do not lose this to a lineup error.** The whole margin is 2.5 points.

**THE MAHOMES WATCH — the one third-party trade that hurts us.** RMonk9 rosters exactly one quarterback (Lamar Jackson, BAL bye 13) and exactly one tight end (Brock Bowers, LV bye 13). His Week 13 collapses to 108.6 with both slots reading zero. It is the last week before the playoff cut, **and he plays Hunter that week.** Mahomes is worth roughly a full starting quarterback week to him there. If Hunter sells Mahomes into that specific week, he strengthens the strongest manager in the league — and **we cannot veto it**: 6 of 8 votes are required and `veto_auto_poll` is off, so trades in this league effectively always pass. The counter is that RMonk9 will almost certainly solve Week 13 off the wire first (Purdy alone is worth more to him than Mahomes, for free), which is a reason to watch rather than to act.

**IF WE MEET HIM IN THE BRACKET.** At full strength in a bye-free window he projects ahead: Weeks 15 to 17 optimal 450.9 to our 433.1, first of eight against our fifth. Nobody in this league has a bye after Week 14, so there is no timing edge available to anyone in December. **The plan cannot be "beat him in the playoffs." It has to be "take Week 8 and out-seed him."**

---

## 4b. The other six, one block each

Briggsy asked for a comparison to every team, not just Hunter. Each block names the exploitable hole, the free wire fix and what it costs him, the key injury exposure, the measured trade willingness, and the two weeks we play him.

**RMonk9 (roster 2) — A-. THIS IS THE REAL TITLE RIVAL, NOT HUNTER.**
`docs/opponents.md` line 78, verbatim: *"RMonk9 is the strongest player in this league. The mission is to beat Hunter; the league is won against RMonk9."* His record: 1st of 8 in points for (2023), 1st of 10 (2024), 12-2 and 2nd of 12 (2025). Measured activity: median 31 transactions a season, top-four in all five measured seasons, **10 trades in five seasons — the most in the room** — and 100 of 100 FAAB spent in three separate leagues.
- **Hole:** worst WR2 slot and worst DEF slot in the league; exactly one QB and one TE, both bye Week 13.
- **Free wire fix:** roughly a full starting quarterback plus a bye-safe TE2 and a DEF2 — the largest free patch anyone in the league can make, and it would move him past BuschLight420 into second overall. His roster grade's own instruction: *"Assume the room's measured best manager makes that claim on Tuesday. Do not build a plan that requires them not to."*
- **Injury exposure:** Mike Evans (33, foot/adductor, a 16-of-17-week FLEX), Luther Burden (groin, no preseason snaps). Structurally, one QB and one TE means an injury there is a zero, not a downgrade.
- **We play him:** Week 4 (slight dog) and **Week 11 (our worst week — this is the one to patch before, not after)**.

**BuschLight420 (roster 6) — B+.**
- **Hole:** dead-last running back room in the league, and all five of his backs carry a live question (Jeanty low ankle sprain from 2026-08-23 with Sleeper mislabelling it "Knee"; Breece Hall thigh-then-groin; Bhayshul Tuten illness plus a co-starter on Jacksonville's own depth chart; Bucky Irving in a declared committee with our Kenny Gainwell as the 1B; **Josh Jacobs on the NFL Commissioner Exempt List since 2026-08-30 with an accelerated 2026-09-10 court date and no return timeline**). Jacobs inflates his season total by roughly 36 points and his roster setting bars an NA tag from IR, so that bench seat is frozen.
- **Free wire fix:** a K for his Week 7 zero and a DEF for his Week 8 zero — the Week 8 zero is larger than his projected margin in that game.
- **Injury exposure:** Ja'Marr Chase hyperextended his left knee 2026-08-25, no reported ligament damage, limited all week but expected for the opener.
- **Trade willingness:** one season on file, 27 transactions, **zero observed trades**. Unknown, and the doc says so.
- **We play him:** Week 6 (his worst week of the year) and Week 13 (our worst).

**kblizzy23 (roster 7) — B-.**
- **Hole:** dead-last RB slot and dead-last FLEX. He spent picks 26, 58 and 87 on the first QB, the first DEF and the second K off the board — the two largest reaches in the entire draft against our board — then added a backup QB at 103 and a backup TE at 119.
- **Free wire fix:** one kicker (his Week 7 zero) and one defense (his Week 11 zero, which is why Week 11 collapses to 124.6). Both free, both erased by a claim.
- **Injury exposure:** Cam Skattebo, untagged but ten months off a dislocated ankle and open tibia fracture he considered retiring from; Quinshon Judkins, untagged, back from a fractured fibula, and losing passing-down work to an unrostered free agent.
- **Trade willingness:** **no history at all.** Brand-new account, zero NFL leagues in 2025, re-verified live tonight. `opponents.md` is explicit: *do not model him, and do not read a blank profile as passive.*
- **We play him:** Weeks 2 and 9, both coin flips.

**MattiICE23 (roster 4) — C+.**
- **Hole:** Week 10 is a three-way collision (Caleb Williams, Saquon Barkley and the Eagles defense all out, with no backup QB and no backup DEF) dropping him to 111.6, and Week 11 is a five-body Rams stack dropping him to 124.8 with a kicker zero.
- **Free wire fix:** a QB, a DEF and a K — enough to move him from fifth to third. He is the only owner in the league whose largest available upgrade is sitting unclaimed.
- **Injury exposure:** **PUKA NACUA is under an open NFL personal-conduct review** with no discipline issued as of tonight and CBS running a "suspension watch" (cbssports.com 2026-09-04); McVay expects him to play Thursday but says he is not privy to the league's process. Nacua is worth roughly 143 to that roster and there is nothing behind him. Also **TreVeyon Henderson**, ankle, non-participant since 2026-08-24 — the news that raises our Stevenson.
- **Trade willingness:** 5 trades in 5 seasons, activity ranging 8/8 to 3/12 — the widest variance in the room.
- **We play him:** Weeks 5 and 12 (a 0.6-point dead heat).

**Kaeperni (roster 5) — C+.**
- **Hole:** last in the league at WR plus FLEX combined, and one QB / one K / one DEF, so Week 8 books a K zero and Week 10 books two zeros (QB Hurts on Philadelphia's bye, Broncos on Denver's).
- **Free wire fix:** a QB, a K and a DEF would move him from seventh to roughly fourth and turn our Week 10 blowout into a coin flip. Assume he finds it.
- **Injury exposure:** **MALIK NABERS is genuinely unresolved for Week 1** — ACL plus meniscus from 2025-09-28, a second cleanup procedure in April 2026, cleared for full-contact practice but **no reported medical clearance for GAME action**; Harbaugh says "on track," Nabers himself is non-committal and says he will not return until he can play four quarters unrestricted. Also Tucker Kraft (ACL, cleanest of the returns) and George Kittle (Achilles, trending to play with a likely snap count).
- **Trade willingness:** **the most active manager in the room** — median 46 transactions, ranked No. 1 in three of five seasons, traded in every single one, 8 trades total. He is the likeliest owner in the league to answer an offer.
- **Roster correction:** he holds **two** tight ends, not three. He dropped Mark Andrews at 22:02:39 tonight for the Steelers defense; the 22:00 dump still shows Andrews.
- **We play him:** Weeks 3 and 10.

**Cltchiefs (roster 8) — D+.**
- **Hole:** dead last at tight end (first TE at pick 105, 36 picks after the seventh team's first TE) and dead last at kicker, with a literal zero at K in Week 5 (Butker, KC bye) and at DEF in Week 11 (Seahawks). He also holds a redundant second QB he cannot start.
- **Free wire fix:** a QB upgrade, a second K and a second DEF would move him from eighth to roughly fourth — ahead of us. **Watch his first two waiver runs.** If he is active he is a playoff team; if not, he is last.
- **Injury exposure:** **Jeremiyah Love**, his pick-24 rookie, has a high ankle sprain reported as "about 50/50" for Week 1 (NBC Sports, Pro Football Rumors, 2026-09-01), LaFleur has not committed him, and Arizona's own early-August depth chart listed Tyler Allgeier ahead of him.
- **Trade willingness:** **no history at all**, same standing as kblizzy23. Do not model.
- **We play him:** Weeks 7 (our cleanest edge) and 14 (the game that should set our seed).

**Two rivals are sitting on suboptimal auto-set lineups tonight.** RMonk9 is starting Davante Adams over Christian Watson (-1.4). Cltchiefs is starting Stafford over Nix and Parker Washington over Jeremiyah Love, leaving 2.4 on the bench. Both are almost certainly post-draft defaults that get fixed by Wednesday — but it is the first observable signal of how much attention each owner pays, and it is a reason to check our own auto-set before kickoff.

---

## 5. Moves

### (a) This week, before kickoff

**Two adds tonight. Both are instant free-agent adds, not waiver claims, so they cost zero priority.** Free agency is open and immediate right now: four transactions completed tonight with no delay, and a player stays addable until his own game kicks off.

**Move 1. Drop Kenny Gainwell, add a quarterback whose bye is not Week 11.**
- Lead: **Brock Purdy** (SF, bye 8, 303.2 season, board r91). Highest projection of any free quarterback, verified Active and named San Francisco's Week 1 starter. Real caveat: he missed eight games in 2025 with a toe injury, and his receiver room is gutted (Christian Kirk on IR with a calf, Ricky Pearsall on IR for the season).
- Equal alternative: **Jaxson Dart** (NYG, bye 8, 296.54). Confirmed starter; Jameis Winston re-signed 2026-09-06 as the clear No. 2. Cleaner health profile.
- Also fine: **Trevor Lawrence** (JAX, bye 7), **Jared Goff** (DET, bye 6), **Tyler Shough** (NO, bye 8), **Baker Mayfield** (TB, bye 10), **Daniel Jones** (IND, bye 13).
- **Hard avoid: Jordan Love (GB) and Sam Darnold (SEA).** Both bye Week 11. They fix nothing.
- **Honest pricing.** The optimizer scores Purdy as a large season gain. **Only the Week 11 slot-fill is real** — roughly a full starting-quarterback week. The rest is Sleeper projecting Purdy about 1.3 points a week ahead of Maye across fifteen weeks, which our own board flatly contradicts (Maye r37, Purdy r91), and which is below the instrument's own resolution. Do not bank it. **At Week 11 itself Purdy and Dart are within half a point of each other. Pick on health and role, not on the decimal.**
- A correction on a QB2's bye: a backup's bye only matters if it collides with the **starter's**. Maye plays Week 6, so a Week 6 bye (Goff) costs nothing. **Week 11 is the only disqualifying bye.**
- Gainwell's drop cost, measured across all 17 weeks: **zero optimal starts**.
- **Deadline: SF at LAR kicks Thu 2026-09-10 8:35 p.m. ET.** Purdy locks then.

**Move 2. Drop Michael Pittman Jr., add a tight end whose bye is not Week 11.**
- Lead: **Dalton Schultz** (HOU, bye 8, 150.9 season). Houston's unquestioned TE1 with a genuine target vacuum behind Nico Collins: Jayden Higgins is out for the season with a torn ACL and Tank Dell is on IR. ESPN lists him Active, no designation.
- Alternatives: **Dallas Goedert** (PHI, bye 10), **Chig Okonkwo** (WAS, bye 7), **Brenton Strange** (JAX, bye 7), **T.J. Hockenson** (MIN, bye 6).
- **Hard avoid: Hunter Henry (NE) and AJ Barner (SEA).** Both bye Week 11.
- **Value: effectively all of it lands in Week 11.** Schultz never out-projects Fannin in a clean week, which is the point; he is a bye patch, not an upgrade.
- Pittman's drop cost: **zero optimal starts.** He is also the most speculative body we own: Sleeper says "Leg," ESPN's Brooke Pryor says hamstring (reported 2026-08-31 and now six days stale), new team, 42-year-old quarterback, zero preseason reps, listed second behind DK Metcalf.

**Combined effect: Week 11 goes from two empty slots to two filled ones, roughly a 30-point swing, converting our largest projected loss of the year into a competitive one. It is still a loss.** The cost is two players who start in zero of our seventeen weeks.

**Move 3 (optional, sequence last). Isiah Pacheco to the open IR slot.**
- On IR with a back injury after a camp MCL sprain, earliest return Week 5, on the offense with the second-highest implied team total of Week 1. He is also the direct handcuff to **Jahmyr Gibbs**, RMonk9's engine and our board's second-ranked player overall.
- **He contributes zero to our lineup by construction. This is an option on a free slot, not a projection gain.** Lions GM Brad Holmes has said there is no clear timetable and the absence could run past the four-game minimum.
- **If Sleeper demands an active-roster body to make the add, do not drop Chris Godwin.** Wait for Wednesday's Bears report; if Swift is cleared, drop **Tony Pollard** then. If Swift is not cleared, skip the stash and leave the slot open.
- **Standing rule:** if Flowers, Swift or Odunze is ruled Out or placed on real NFL injured reserve, drop **Pacheco** first to free the slot. Before Godwin, before Pollard.
- **IR trap worth knowing:** an IR player upgraded to Questionable freezes the entire roster (no lineup edits, no adds) until you drop somebody. Check both reserve tags every Wednesday.

**Do NOT do these four things.**
- **Do not claim Mark Andrews.** Kaeperni dropped him at 22:02:39 tonight, so he sits on waivers about 24 hours. Our waiver priority is rolling and never resets, we sit third behind Cltchiefs (who own the worst tight end room in the league) and kblizzy23, and the prize over Schultz is **under one point across a whole season.** Take Schultz free tonight. If Andrews clears unclaimed Monday night, add him free then and drop Schultz.
- **Do not roster a backup kicker or defense now.** Both bye in Week 6 and that is a one-week problem. Handle it as a two-for-two swap in Week 6 itself.
- **Do not hoard handcuffs.** I tested every free-agent back and receiver against our lineup: Kaelon Black, Rachaad White, Roschon Johnson, Tyjae Spears, Chris Rodriguez, Tyler Allgeier and Woody Marks all add nothing to our optimal lineup. The only exception in the entire pool is **Jalen Coker**, worth a couple of points of bye-week cover, still inside noise.
- **Do not stream the defense in Week 2.** The upgrade is under a point, we will be at 18 of 18 roster spots, and the only way to add a streamer is to permanently drop a Vikings unit tied for the best free-agent defense available with no path to get it back.

**Week 1 lineup.** The standard ten: **Maye**, **Taylor**, **Chase Brown**, **Collins**, **London**, **Fannin**, FLEX **Flowers**, FLEX **Swift**, **Bates**, **Vikings**.

**Open the app and verify Sleeper's auto-set matches those ten before Wednesday's kickoff.** Two rivals are sitting on suboptimal post-draft defaults tonight; do not be the third.

**The one genuine decision, and it is due Wednesday.** FLEX2 is **D'Andre Swift** (13.7, plays Sunday 1:00) or **Rhamondre Stevenson** (Sleeper says 11.8, stale low, plays Wednesday 8:20 p.m.). If you start Stevenson he locks Wednesday night before Chicago's report exists. **Rule: start Stevenson over Swift only if by Wednesday afternoon Henderson is officially Out or has still not practised AND Swift is still carrying a designation. Otherwise leave Swift in and take Sunday's information.**

**THE RACHAAD WHITE FORK — named explicitly, because two plans want the same roster spot.**
The beat-Hunter analysis ranks claiming **Rachaad White** as "the highest-leverage waiver claim of our season" and instructs: take him now with an instant free-agent add, drop Kenny Gainwell. This report instead drops Gainwell for Brock Purdy. **Both moves want the same body, and only one can have it tonight.**
- **The call: Purdy.** A Week 11 zero at quarterback costs a whole starting-QB week in a game we are already projected to lose badly; the White claim buys a 2.5-point block in Week 8 that is contingent on Hunter noticing a wire fix he has never once taken in five measured seasons.
- **The cost of deferring, stated plainly:** White (10.0 in Week 8) or Jalen Coker (11.9 in Week 8) closes more than our entire Week 8 margin for him, and **he can claim either on any Wednesday between now and Week 8.** We are trading a certain fix for a probabilistic block.
- **The trigger that reverses it:** take White the moment a bench spot frees up — a trade, an injury drop, or Godwin becoming expendable after Week 8. And read Hunter's transaction log every Wednesday; if he adds a running back, the block is gone and we play our ceiling in Week 8 instead of our floor.

**Week 6, put it on the calendar now.** In Week 6, drop **Jake Bates** and the **Vikings** and add a kicker and a defense for that week.
- **The best kicker projections available in Week 6 are Tyler Loop (7.56), then Andy Borregales and Eddy Pineiro (7.25 each).** All three are excluded: **Loop's bye is Week 13**, already our worst week and the one nothing else fixes; **Borregales' bye is Week 11**, the week we just spent two moves repairing; **Pineiro's bye is Week 8**, the Hunter week. The best **bye-safe** options are therefore **Tyler Bass** (BUF, bye 7, 7.19), **Chase McLaughlin** (TB, bye 10, 7.19) and **Chris Boswell** (PIT, bye 9, 7.00).
- **Best bye-safe defenses:** **Chiefs** (bye 5, 6.94), **Steelers** (bye 9), **Bears** (bye 10), **Cowboys** (bye 14). **Avoid the Patriots and Packers — both bye Week 11.**
- **Recomputed with the substitutes we actually recommend (Bass 7.19 and the Chiefs 6.94), the swap is worth about +14.1, not the +14.9 an earlier draft quoted with Loop and the Patriots.**
- **One Week 6 baseline, carried everywhere: 123.8** is the raw optimal from the dump. Adding roughly +14.1 gives about **137.9 against BuschLight420's 135.6 — a projected win by about 2.3.** That is the number used in section 6. (An earlier draft quoted 125.5 and 140.4; those were computed off a post-Purdy baseline and are retired.)
- **Also avoid Will Reichard (MIN), Evan McPherson (CIN) and the Lions defense: all bye Week 6.** They fix nothing.
- **Sleeper 24-hour rule:** anything added via free agency must be owned 24 hours before you drop it, or he goes straight back to free agency instead of waivers. Make streaming adds early in the week, never Sunday morning.

### THE WEDNESDAY 2026-09-09 BLOCK — five deadlines, one checklist

Everything below lands on the same day. Work it top to bottom.

| Time | What happens | What you do |
|---|---|---|
| **~03:05 a.m. ET** | First scheduled waiver run clears (measured: 98 of 113 and 76 of 84 completed waivers in two of Hunter's 2025 leagues sharing our exact settings landed Wednesday 03:00-03:59 ET) | Nothing — everything we want tonight is an instant free-agent add, not a claim |
| **Morning** | **Chicago's first required injury report** | Resolves **D'Andre Swift** (cramps or not) and **Rome Odunze** (right leg). Governs the FLEX2 call. |
| **Morning** | **Baltimore's first required injury report** | Resolves **Zay Flowers** (quad / lower body). Watch for full participation versus limited. |
| **Daily** | **Patriots must report daily into a Wednesday game** | Resolves **TreVeyon Henderson**. Governs Stevenson-versus-Swift at FLEX2. |
| **Press conference** | **Atlanta names a Week 1 quarterback** | Resolves **Drake London**'s ceiling. Tua or Penix. |
| **Anytime** | Read Sleeper's transaction log | **Count Hunter's moves.** Three or more by Week 3 kills the attrition thesis. |
| **Before 8:20 p.m. ET** | **NE at SEA kicks — locks Maye, Stevenson and Hunter's Jason Myers** | **Open the app. Verify the auto-set lineup matches our ten. Set FLEX2.** |

### (b) Trades to propose now

**None. Zero trades survived adversarial review tonight, and the reason is worth more than any of the trades would have been.**

Twenty distinct trade proposals were built and every one was killed (the kill file holds 22 entries; two of those are the waiver plans, carried with no kill reason). Two patterns did the killing.

**Pattern one: our tight end "problem" is smaller than it looks, and the market cannot fix it.** Our board ranks **Harold Fannin r73, tier 3**. Every tight end available on the market ranks below him: Tucker Kraft r76, Kyle Pitts r77, Sam LaPorta r83, George Kittle r92, Travis Kelce r93. So does every tight end in free agency (best is Brenton Strange at 161.0, against Fannin's 180.4). Sleeper's *weekly* feed disagrees and likes Kittle, Kraft and LaPorta better. Sleeper's own *season* feed sides with our board. **Two of three instruments say we already own the best tight end obtainable.** Every "TE upgrade" on the table was a rank downgrade, a tier downgrade and a VORP downgrade, paid for with real assets, on the strength of one column of one vendor's file.

**Pattern two: the counterparty math.** Every attractive-to-us deal was catastrophic for the other side on the numbers they see in their own app, and the two owners with genuine surplus (Hunter and BuschLight420) are the two with the least measured willingness to trade.

**The Hunter asymmetry, priced.** Our bench pieces are worth a great deal to his roster — Jonathan Taylor, Nico Collins, Chase Brown, Drake London and Zay Flowers all rank as major upgrades to his season — while his best chip, Garrett Wilson, is worth a fraction of that to ours. **Therefore every name-for-name 1-for-1 overpays him.** Two standing refusals follow:
1. **Never sell him a running back, and never sell him any FLEX-eligible body active in Week 8.** Week 8 is the only game his optimal lineup loses all season, and it loses to us.
2. **Refuse Mahomes and Kelce at any price he would accept.** Mahomes fills a real hole for four single-QB teams, but Purdy, Dart, Goff and Lawrence are all free agents — the wire sells the same product for a claim. Same logic on Kelce: our TE hole closes nearly as well off the wire, and paying a starter for a 36-year-old TE2 who starts 2 of 17 weeks on his own roster is exactly the trade he wants.

**What to do with the week instead: nothing.** Our chips are suppressed right now. Odunze carries a Questionable tag two days before kickoff, which is an argument for waiting a week before shopping him. Stevenson's value is rising tonight and will be settled by Wednesday's game. Prices set on draft-night projections are worse than prices set on three weeks of usage.

### (c) Trades to hold until a trigger

| Trigger | Then do this | Why |
|---|---|---|
| **Fannin draws fewer than about 5 targets a game through Week 3** | **Reprice, do not chase.** The only four tight ends in this league that beat Fannin on our board are **McBride r17** (Hunter's), **Bowers r19** (RMonk9's), **Loveland r35** (kblizzy23's) and **Warren r52** (MattiICE23's) — and the kill file prices every one as unbuyable: Bowers leaves RMonk9 without a legal lineup; Loveland costs kblizzy23 far more than it gains him and he reached 31 picks above market to get him three hours ago; Warren costs MattiICE23 heavily and creates a brand-new Week 7 zero at TE; McBride is the rival's. **The honest answer is that this hole does not close by trade.** | Every purchasable tight end ranks below Fannin on our board. Buying one is a downgrade wearing a bigger name. |
| **Zay Flowers or Nico Collins misses multiple weeks** | The priority flips from tight end to receiver. Buy a WR2, sell from the running back room (we hold six). | Our receiver-slot advantage over Hunter is the one edge we actually own. Protect it before upgrading anything else. |
| **Anything happens to Jonathan Taylor or Chase Brown** | Trade, do not stream. Best free back is Aaron Jones and he is in a committee behind Jordan Mason. | The wire cannot replace a starting back in this league. |
| **We are 5-2 or better entering Week 8** | Buy for Week 13 specifically. Target RB or WR depth whose bye is **not** Week 13 (avoid Indianapolis and Baltimore bodies). Sell Odunze, Godwin, Pollard. | Week 13 is our only unfixable week and it lands in the seeding stretch. The trade deadline is Week 11, so this must close by roughly Week 9. |
| **Hunter makes three or more transactions in Weeks 1 to 3** | The attrition thesis is dead. Stop planning around his inactivity and play pure schedule-and-seeding. | It is a two-independent-room measurement, never cross-validated. Test it every Wednesday from the transaction log. It is free to check. |
| **Hunter and RMonk9 open a conversation** | Watch for Mahomes moving to roster 2. We cannot veto it. | It fixes RMonk9's Week 13 zeros in the last week before the cut, in the game he plays Hunter. It is also direct evidence Hunter does trade, which kills the row above. |
| **McCaffrey is downgraded at any point** | Claim **Kaelon Black** (SF, unrostered by anyone) immediately, and reset ambition from "upset him in Week 8" to "take the top-two seed outright." | Losing McCaffrey costs Hunter roughly a seventh of his season with a wire capped near 10 points a week. |

### (d) Rejected ideas, one line each

Twenty proposals were built and killed. All twenty:

- **Garrett Wilson + Kelce + Mahomes for Odunze + Godwin + Pittman:** on Sleeper's season column he ships far more than he receives; he declines on sight, and it strips his only QB2 and only TE2 in the same move.
- **Mahomes + Kelce for Godwin + Pittman:** we would be buying a quarterback the waiver wire sells better and a 36-year-old TE2 for two live receivers.
- **Kelce for Godwin + Pittman (WR-only variant):** same instrument error; 61% of the claimed gain is Sleeper's two feeds contradicting each other on Kelce and Fannin by 29 points.
- **Odunze for George Kittle (Kaeperni):** our board has Fannin r73 ahead of Kittle r92, Kittle's bye is Week 8 (the one Hunter game we win), and he would not even beat Fannin in Week 1.
- **Pollard + Gainwell for Kittle:** cheaper version of the same instrument error, and it empties the running back room from six to four.
- **Godwin + Pittman for Kittle:** the give side is genuinely free, but the board ordering inverts and 30% of the gain is a hole a free waiver claim already closes.
- **Pittman for Tucker Kraft:** Kraft's Green Bay bye is Week 11, the same as Fannin's, so after the trade we would roster two tight ends and still field a zero in the week the trade exists to fix.
- **Stevenson for Tucker Kraft:** same Week 11 collision, and it sells the one asset whose value is rising tonight.
- **Godwin for Sam LaPorta (BuschLight420):** it would open a zero at tight end in Week 11, his best week of the season and his biggest projected margin.
- **Odunze + Gainwell for LaPorta:** the pitch is an RB-panic argument that *reduces* his running back projection, and the Jacobs seat it leans on is untouched by a 2-for-2.
- **Stevenson + Gainwell for LaPorta:** sells the one asset whose value is rising tonight, into the roster whose backfield is on fire, and hands a rival we play twice his most-needed piece.
- **Stevenson straight for LaPorta:** same defect without the sweetener; the counterparty is at 16 of 16 with a frozen Jacobs seat and cannot clear room.
- **Swift + Gainwell for Colston Loveland (kblizzy23):** he reached 31 picks above market to get Loveland three hours ago, and the deal costs him roughly twelve times what it gains him.
- **Stevenson + Pittman for Tyler Warren (MattiICE23):** Stevenson and Henderson share the same New England bye, so the entire bye-insurance pitch is self-refuting.
- **Stevenson + Odunze + Gainwell for Tyler Warren:** same self-refuting bye, plus it creates a brand-new Week 7 TE zero for him that he will find in one glance.
- **Fannin + Odunze + Pollard for Kyren Williams (Cltchiefs):** premised on Kyren being benched; he is actually in Cltchiefs' live starting lineup at RB2.
- **Fannin for Parker Washington (Cltchiefs):** sells the one tight end whose bye complements any acquisition, to buy a seventh receiver, and hands a team we play in Weeks 7 and 14 a real upgrade.
- **Kittle for Godwin + Pittman:** the entire per-week gain is one vendor's two feeds disagreeing by more than the gain itself.
- **Kittle + Etienne for Pollard + Godwin:** worse than the above — it puts both acquired players on the same Week 8 bye, the one Hunter game we are projected to win.
- **Standing "never sell Hunter a running back" rule, priced as a proposal:** correct as a constraint, wrong as a trade; it protects a residual smaller than advertised once his free-agent alternatives are counted. Keep the rule, drop the ceremony.

---

## 6. Season plan by phase

**PHASE 0. Tonight and Tuesday, before the first kickoff.**
Two free-agent adds and two drops (section 5a). Optionally the Pacheco stash, sequenced last. Verify Mark Andrews' waiver status in the app rather than claiming him. **Trigger that changes it:** if Purdy is gone, take Dart and lose nothing meaningful; if the entire top of the QB pool is gone, the Week 11 hole becomes real and our "sixth to fourth" claim collapses. Re-pull the free-agent list before acting; the dump was already three minutes stale when it was written.

**PHASE 1. Weeks 1 to 4. Bank the floor, do not chase.**
Week 1 Hunter (coin flip), Week 2 kblizzy23 (coin flip), Week 3 Kaeperni (slight edge us), Week 4 RMonk9 (slight dog). All four are bye-free league-wide, so no schedule work helps. **2-2 is an acceptable start** because the gifts arrive in Weeks 6 to 8. Do not trade; prices are still draft-day prices and two of our own chips carry tags. **Trigger:** three-plus Hunter transactions kills the attrition plan; an 0-3 start with everything patched and nobody hurt means the roster is worse than both instruments say, and the correct move flips from buying a tight end to selling depth for a genuine top-15 asset before the Week 11 deadline.

**PHASE 2. Weeks 5 to 9. The harvest. This is where the season is made.**
This is the three-gift stretch the schedule handed us, and they land consecutively.
- Week 5 MattiICE23 (slight favorite; he loses Tetairoa McMillan to a bye and Henderson is on an ankle).
- **Week 6 BuschLight420** — his worst week of the season (135.6). Raw line says we lose by 11.8 because of our own two empty slots; with the K and DEF swap made, **123.8 + about 14.1 = roughly 137.9 against his 135.6, a projected win by about 2.3.**
- **Week 7 Cltchiefs** (+9.6, the cleanest edge we own and the only one that survives correction untouched; he loses Cook, McConkey and Parker Washington to byes with no bench fix).
- **Week 8 HUNTER** (+2.5, his worst week of the season, the game).
- Week 9 kblizzy23 (coin flip).
**Target 4-1 or better.** Trade window opens here once three weeks of usage have set prices.

**PHASE 3. Weeks 10 to 14. The gauntlet, with two hard deadlines.**
Week 10 Kaeperni is a **mirage** — check the zero-slot ledger: his 112.7 is two empty slots (QB and DEF), and one waiver claim erases most of the gap. Do not budget it as a win. **The same warning applies to BuschLight420's Week 8 DEF zero, kblizzy23's Week 11 DEF zero, Cltchiefs' Week 5 K zero and Week 11 DEF zero, and MattiICE23's Week 10 double zero.** Week 11 RMonk9 is our structural worst week; with the September patches in place it reads competitive instead of catastrophic, but it is still a projected loss. **Deadline one: the trade deadline is Week 11**, so every roster fix by trade must close by roughly Week 9 or 10. **Deadline two: Week 13 is the week streaming cannot touch** (Taylor and Flowers bye together, replacements are simply worse, against BuschLight420, in the second-to-last seeding week). Week 12 MattiICE23 is a dead heat and Week 14 Cltchiefs is a clear edge; those two set our seed.

**PHASE 4. Weeks 15 to 17. Play for the bye, then play it out.**
Six of eight make the playoffs, so qualifying is close to automatic and is the wrong goal. **The prize is a top-two seed.** Reading the live bracket: only two round-1 games exist and two teams enter at round 2, so **seeds 1 and 2 get a Week 15 bye and need two wins; seeds 3 through 6 need three.** Standings tiebreak is Record, then Points For, then higher Points Against, so **never bench a ceiling play in a game you are already winning by 30.** Playoff ties go to the higher seed automatically, which makes seed worth more here than in a flat bracket. Nobody in this league has a bye after Week 14, so December is pure talent plus waiver work. Keep streaming the kicker and defense weekly; that is a free 7 to 8 points a slot. Week 17 is the title week and NFL teams rest starters in Week 17, which no projection in this file models.

**Throughout, two things every Wednesday.** Set the lineup after the official injury reports, not before. And read the transaction log and count Hunter's moves; that one check is the cheapest test of whether this whole plan is still the right plan.

---

## 7. Sources and confidence

### Verified tonight, with source and date

| Claim | Source | Date |
|---|---|---|
| Draft complete, 128 of 128 picks, our slot 6, Hunter's slot 3 | Sleeper draft API, re-pulled | 2026-09-06 22:0x ET |
| Waiver priority: us 3rd, Hunter 6th; rolling, never resets; budget field inert | Sleeper `rosters.settings.waiver_position`; support.sleeper.com 9656662 | tonight |
| Waivers clear Wednesday ~03:05 a.m. ET | support.sleeper.com 3978868, plus 113 and 84 completed waivers measured in two of Hunter's 2025 leagues sharing our exact settings | tonight |
| Six long-TD bonuses present and stacking; no TE premium; 12 DEF keys; `league_average_match: 0` | Live `scoring_settings` object | tonight |
| Top-2 seeds get a Week 15 bye; 6 of 8 qualify | live `/winners_bracket` (two round-1 games, two teams enter at round 2) | tonight |
| Weeks 15-17 in the schedule are a phantom round-robin repeat | matchups_15 pairing-identical to matchups_1, and so on | 21:59 ET |
| TreVeyon Henderson a non-participant, hasn't practised since 2026-08-24 | **Patriots' first official Week 1 injury report** (primary), carried by PFT / Yahoo / Rotowire | 2026-09-06 |
| McCaffrey expected to play Week 1; August absence was load management | nfl.com, 49erswebzone.com, footballnationusa.com, rotowire.com | 2026-09-06 |
| Puka Nacua under open NFL conduct review, no discipline issued; McVay expects him to play | espn.com/nfl/story/_/id/49853118, cbssports.com "suspension watch" | 2026-09-04 / 09-06 |
| Malik Nabers cleared for contact practice but not for game action; non-committal himself | profootballrumors.com, nbcsports.com, si.com | 2026-09-06 |
| Ja'Marr Chase hyperextended left knee 2026-08-25, no ligament damage, expected for opener | si.com, joxfm.com, footballnationusa.com | 2026-09-01 / 09-02 |
| Jeremiyah Love high ankle sprain, "about 50/50" for Week 1, LaFleur uncommitted | nbcsports.com, profootballrumors.com | 2026-09-01 |
| Tee Higgins heel contusion, limited, expected for the opener | nbcsports.com, profootballnetwork.com, rotoballer.com | 2026-09-01 to 09-03 |
| Zay Flowers returned to practice Thu | ESPN injuries API quoting 105.7 The Fan | 2026-09-03 |
| Swift cramps per Schefter; Odunze "should be all good" per Chicago Tribune | ESPN injuries API | 2026-09-03/04 |
| Atlanta had not named a Week 1 QB; announcement expected Wed | ESPN, nfl.com, atlantafalcons.com | 2026-09-06 |
| Jason Myers missed 3 of 5 FG and 2 of 4 XP in preseason; only kicker on the roster | seahawks.com, si.com, 12thmanrising.com, rotowire.com | 2026-09-06 |
| Josh Jacobs on the Commissioner Exempt List since 2026-08-30, court date moved to 09-10 | ESPN (id 49827202), nfl.com, apnews.com | 2026-09-06 |
| Xavier Worthy Active, no designation, "nice camp" per Reid | ESPN injuries API | 2026-08-29 |
| Rachaad White is the passing-down back; Croskey-Merritt has early downs and goal line | rotoballer.com, draftsharks.com, commanders.com depth chart | 2026-09-06 |
| Oronde Gadsden working with backups behind Kolar and Njoku; #6 most-dropped tonight | profootballnetwork.com, rotoballer.com, Sleeper trending | 2026-09-06 |
| Deshaun Watson named Cleveland's Week 1 starter (drives Fannin's ceiling) | nfl.com, clevelandbrowns.com | 2026-08-24 |
| Hunter's transaction history: bottom-two in 5 of 5 seasons, 0 trades in 2025, 1 of 100 FAAB | Sleeper `/transactions` across 5 historical leagues, computed | tonight |
| Kaeperni dropped Mark Andrews at 22:02:39, after the 22:00 dump | Sleeper `/transactions/1` | tonight |

### Unverified, and labelled as such

- **Washington's Week 1 opponent.** Two grounded searches returned flatly conflicting answers (at Philadelphia vs. vs. the Giants), both Sunday 4:25 p.m. ET. Affects Jayden Daniels and Croskey-Merritt on Hunter's side.
- **Whether Philadelphia plays at all in Week 1 and when.** Could not be established. Affects DeVonta Smith and Makai Lemon.
- **Whether Andy Reid has formally named Mahomes the Week 1 starter.** Strong indications, no explicit announcement found.
- **Re-seeding between playoff rounds.** The league's re-seeding switch reads `1`, which we believe means on, and Sleeper documents a re-seed toggle — but the article never maps it to the API value. The bracket's shape (round-3 games carry path keys, round-2 games do not) argues re-seed is on. **The discriminating observation to make in Week 15:** if the two winners are assigned to the bye teams by seed rather than by bracket side, re-seed is confirmed.
- **The exact trade-deadline instant** (start of Week 11 vs. end). No Sleeper documentation found. Treat the start of Week 11 as the deadline.
- **Whether a tight end can fill our FLEX slots.** The label is plain "FLEX," which should mean RB/WR/TE, but no team in this league currently starts a tight end at FLEX, so we have no in-league proof.
- **Marvin Harrison Jr.'s "camp yips"** could not be confirmed or refuted. Every source found attributes his 12-game 2025 to a concussion, an appendectomy and heel injuries.
- **Tank Dell's actual return timeline.** "Week 5" is an eligibility floor, not a projection. ESPN's return dates are boilerplate eligibility markers: our own Dell shows 2026-10-11 with a torn ACL and MCL, and nobody comes back from that in five weeks.
- **Why Devaughn Vele spiked to 107,380 adds tonight.** Jordyn Tyson's IR placement is a week old and does not by itself explain a Sunday-night surge. There may be unreported Sunday news.

### Where the two projection sources disagree

1. **Team level they invert; player level they agree.** Player-to-player agreement is Spearman 0.973 (median rank difference 1.0). Team-to-team agreement is 0.310. **The disagreement is entirely about what each one sums, not about which players are good.** Sleeper counts ten lineup slots for seventeen weeks and scores an unfilled slot as zero. Our board counts all sixteen roster spots against a free-agent replacement level.
2. **Our quarterback.** Sleeper's weekly feed would bench **Drake Maye** for **Brock Purdy** in fifteen of seventeen weeks on a gap of about 1.3 a week. Our board has Maye r37 and Purdy r91. That 1.3 is below the instrument's own resolution: measured across 113 rostered players, the median week-to-week swing in Sleeper's weekly numbers is **0.70 points**. It is a season total divided by games, not a matchup read. Do not bank it.
3. **The entire tight end market.** Our board: Fannin r73 ahead of Kraft r76, Pitts r77, LaPorta r83, Kittle r92, Kelce r93. Sleeper's weekly feed: the reverse for three of those five. Sleeper's own season feed: agrees with our board on Fannin over Kittle and over Kelce. **Sleeper contradicts itself by roughly 31 points on the Fannin/Kittle pair alone**, which is larger than the entire gain any of those trades claimed.
4. **Kickers and defenses past Week 2 carry no information.** Twenty of twenty free defenses and nineteen of twenty free kickers have a perfectly flat weekly projection from Week 3 through Week 17. The implied-total reasoning from betting lines stands on its own; the projections add nothing.
5. **Hunter's roster is where the two instruments disagree most in the whole league.** Sleeper first, our board fifth. Both describe the same shape from opposite sides: long on breadth, short on top end.

### The two caveats that sit under this report's own thesis

**Caveat one: the realised-value check reverses our board's first place.** Running our top-of-roster players through the realised curve instead of the board curve, Hunter's six measured players fall from 651.2 board VORP to 486.9 realised while ours fall from 724.0 to 460.8 — **reversing the board's ordering on those same twelve players.** The mechanism is that his roster is concentrated in the slots the curve overstates *least* (Achane at RB7 is the smallest overstatement of any RB cell) and ours in the slots it overstates *most* (Maye at QB3 is the second-largest cell in the entire table). **This is direction only.** The quadrature standard error is 62.0 on our side and 52.7 on his, so a roughly 26-point flip is about 0.3 sigma and well inside the measurement's own noise, and insight 024 held the realised curve out over twelve seasons and found it indistinguishable from the shipped board. It is not a licence to reorder anything. **But it is the single strongest argument against reading our board-VORP first place as a prediction, and the "most talent, worst build" framing in section 2 should be read with it attached.**

**Caveat two: the "the wire is deep enough to fix our holes" thesis rests on one draft.** Insight 027: every 8-team measurement this project holds shows the availability model negative at every gap, six of the seven drafts in the corpus are 10- or 12-team, and **the 8-team column rests on a single draft.** The direction-only finding that survives is that 128 picks in an 8-team room leave roughly 50 of the top 180 players undrafted. That is precisely why a 303-point quarterback and a 161-point tight end are sitting unrostered tonight, and it is why the whole patch-our-holes-off-the-wire plan works. **Do not put a percentage on it.** If a second 8-team sample says the pool is thinner than we think, the entire "out-manage, do not out-draft" framing weakens.

### Confidence, stated plainly

- **High confidence:** the Week 11 hole and its fix; the Week 6 kicker and defense collision and its fix; the schedule facts (two Hunter games, Week 8 is his worst week, identical opponent sets league-wide); the waiver mechanics; the zero-slot ledger; the fact that no trade on the board tonight clears our own board's ordering test.
- **Medium confidence:** the power-ranking order in the middle of the table (four teams sit inside 20 points across seventeen weeks, which is about 1.2 a week); our own ceiling and floor; whether the Week 13 problem is solvable by trade at all.
- **Low confidence, treat as direction only:** Hunter's inactivity holding for a third room and a sixth season; his behavioral profile predicting anything (his personal draft model scores worse than a constant that always guesses wide receiver, and his single most confident measured tendency broke tonight); anything about the bracket, which is unpopulated with every roster at 0-0-0; the realised-value reversal above.
- **My call on where we finish: third to fifth of eight, and a playoff team barring injury.** The deterministic record projections put us at 9-8 optimal-versus-optimal and 9-5 stream-adjusted through Week 14; both are orderings, not forecasts. Six of eight qualify, so missing requires an active faceplant. The floor is sixth if Weeks 6 and 11 go unpatched and Flowers' quad lingers. The ceiling is second if the Week 13 problem gets solved and the schedule luck holds — which is, in the end, the whole thesis: **we are fifth of eight on talent and first of eight on schedule, and the season is won by out-timing this league rather than out-rostering it.**