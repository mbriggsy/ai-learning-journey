# M1 Ledger — Consistency Summary (auto-generated; reflects the POST-FIX ledger)

Totals: 1081 rows, 1078 must-survive. Verify-pass applied: 79 in-part fixes + 21 README dual-canonical flips.
Dispositions (post-fix): canonical 532  drop 2  no-move 71  pointer 202  reframe 274  

## KIND x HOME (count)
```
    166 invariant -> architecture
     89 requirement -> product
     63 status-as-built -> roadmap
     59 requirement -> roadmap
     45 number-or-figure -> research/engine-tax
     36 definition-term -> glossary
     34 build-detail-or-KTD -> plans/4-recommendation
     31 build-detail-or-KTD -> architecture
     28 lesson -> insights
     27 decision-rationale -> plans/3-controls
     27 build-detail-or-KTD -> plans/1-engine
     25 requirement -> plans/2-first-answer
     24 decision-rationale -> decisions/accumulation
     23 invariant -> plans/2-first-answer
     23 build-detail-or-KTD -> plans/2-first-answer
     21 scope-boundary -> product
     20 requirement -> plans/3-controls
     18 decision-rationale -> decisions/ss-computation
     15 decision-rationale -> product
     15 decision-rationale -> plans/4-recommendation
     15 build-detail-or-KTD -> plans/3-controls
     14 invariant -> glossary
     12 number-or-figure -> architecture
     12 decision-rationale -> decisions/other-income-r40
     11 number-or-figure -> research/pre65
     11 invariant -> research/pre65
     10 scope-boundary -> roadmap
     10 invariant -> product
     10 definition-term -> roadmap
     10 build-detail-or-KTD -> decisions/other-income-r40
      9 decision-rationale -> research/pre65
      9 build-detail-or-KTD -> research/engine-tax
      8 status-as-built -> research/pre65
      8 scope-boundary -> architecture
      8 decision-rationale -> glossary
      8 decision-rationale -> decisions/portfolio-holdings
      7 status-as-built -> research/engine-tax
      6 scope-boundary -> research/engine-tax
      6 number-or-figure -> glossary
      6 invariant -> plans/1-engine
      6 decision-rationale -> plans/2-first-answer
      6 build-detail-or-KTD -> roadmap
      5 scope-boundary -> research/pre65
      5 lesson -> product
      5 decision-rationale -> architecture
      4 scope-boundary -> plans/1-engine
      4 scope-boundary -> decisions/other-income-r40
      4 requirement -> plans/4-recommendation
      4 number-or-figure -> roadmap
      4 number-or-figure -> plans/1-engine
      4 invariant -> plans/3-controls
      4 definition-term -> architecture
      4 decision-rationale -> plans/1-engine
      4 build-detail-or-KTD -> decisions/accumulation
      3 requirement -> research/pre65
      3 invariant -> roadmap
      2 scope-boundary -> glossary
      2 scope-boundary -> decisions/portfolio-holdings
      2 other -> DROP
      2 lesson -> research/engine-tax
      2 invariant -> decisions/accumulation
      2 definition-term -> research/pre65
      1 status-as-built -> product
      1 status-as-built -> plans/4-recommendation
      1 status-as-built -> glossary
      1 scope-boundary -> plans/4-recommendation
      1 scope-boundary -> plans/2-first-answer
      1 scope-boundary -> decisions/ss-computation
      1 scope-boundary -> decisions/accumulation
      1 requirement -> research/engine-tax
      1 requirement -> glossary
      1 other -> product
      1 number-or-figure -> plans/4-recommendation
      1 lesson -> architecture
      1 invariant -> research/engine-tax
      1 definition-term -> product
      1 definition-term -> plans/3-controls
      1 definition-term -> decisions/accumulation
      1 decision-rationale -> roadmap
      1 decision-rationale -> research/engine-tax
      1 decision-rationale -> insights
      1 build-detail-or-KTD -> product
      1 build-detail-or-KTD -> insights
```

## DISPOSITION x HOME (count)
```
    123 canonical @ architecture
     95 canonical @ product
     74 canonical @ roadmap
     72 pointer @ architecture
     60 canonical @ plans/3-controls
     53 canonical @ plans/4-recommendation
     50 pointer @ glossary
     50 canonical @ research/engine-tax
     49 reframe @ roadmap
     48 canonical @ plans/2-first-answer
     40 no-move @ research/pre65
     35 reframe @ plans/1-engine
     33 pointer @ roadmap
     32 reframe @ architecture
     30 no-move @ insights
     29 reframe @ plans/2-first-answer
     29 pointer @ product
     26 reframe @ decisions/other-income-r40
     26 reframe @ decisions/accumulation
     20 reframe @ product
     16 reframe @ decisions/ss-computation
     15 reframe @ research/engine-tax
     14 reframe @ glossary
     10 canonical @ plans/1-engine
      6 pointer @ research/pre65
      6 pointer @ research/engine-tax
      6 canonical @ decisions/portfolio-holdings
      5 reframe @ plans/3-controls
      4 canonical @ glossary
      4 canonical @ decisions/accumulation
      3 reframe @ plans/4-recommendation
      3 reframe @ decisions/portfolio-holdings
      3 canonical @ decisions/ss-computation
      2 pointer @ plans/3-controls
      2 pointer @ decisions/accumulation
      2 drop @ DROP
      2 canonical @ research/pre65
      1 reframe @ research/pre65
      1 pointer @ plans/2-first-answer
      1 pointer @ decisions/portfolio-holdings
      1 no-move @ research/engine-tax
```

## Acceptance tests (deterministic, post-fix) — ALL PASS
- Dual-canonical: every distinct signature has at most ONE canonical row (the gate's prescribed acceptance test). CLEAN.
- features/ dissolved: no row targets a features/ path (16 home sections, none features/).
- accumulation fold C1-C3: reframed present-tense, IDs kept, zero drop.
- 3 NEW decisions records fed: ss-computation 19, other-income-r40 26, portfolio-holdings 10.
- cardinal rule: product §2 canonical; README plain-language version is a pointer (its front-door copy already shipped CP1.5).
- block-count / zero-loss: 1081 blocks (1078 must-survive + 2 drop + 1 header legend example).
