/**
 * src/ui/screens/setup/__tests__/walkDrafts.fixture.ts: the drafts the DELETED guided walk left, recorded at Act 6 · RC14's
 * base commit 7933cf12e, before the walk was deleted (the project's externally-derived-fixture law, DND 012: the stepper's
 * equivalence is checked against what the walk itself wrote, never against the stepper's own code).
 *
 * HOW IT WAS MADE: a one-off vitest recorder (deleted in the same change) drove the real walk in jsdom.
 *  - `households`: `IntakeFlow` over `intakeSteps(draft)` on the store's own `createMemoryModel` (start year 2026, a
 *    stubbed engine), every answer typed into the walk's own fields and each step passed by its own Continue, to the
 *    terminal advance. `retired` is Pat (1960) and Lee (1963), both retired, in Pennsylvania; `working` is Alex (1968,
 *    working) and Sam (1965, retired), in North Carolina. The answers are listed in `stepper.test.tsx`, which gives the
 *    stepper the same ones.
 *  - `parity`: the walk side of every `walkParity.test.tsx` case as it stood at the base (each step body rendered over a
 *    stand-in StepApi, or the account and income entry forms), from the dev seed it started on (`start`, kept here so a
 *    later seed change can't move the comparison).
 * Fresh ids (accounts, budget lines) are random on both sides; the tests compare them apart from their ids.
 */
import type { ScenarioDraft } from '@store/memoryModel'

export const WALK_HOUSEHOLDS: { readonly retired: ScenarioDraft; readonly working: ScenarioDraft } = {
  "retired": {
    "people": [
      {
        "name": "Pat",
        "birthYear": 1960,
        "currentAge": 66,
        "sex": "female",
        "workStatus": "retired",
        "earnedIncomeReal": 0,
        "retirementAge": 62,
        "pia": 28800,
        "socialSecurityClaimAge": 70
      },
      {
        "name": "Lee",
        "birthYear": 1963,
        "currentAge": 63,
        "sex": "male",
        "workStatus": "retired",
        "earnedIncomeReal": 0,
        "retirementAge": 60,
        "pia": 21600,
        "socialSecurityClaimAge": 67
      }
    ],
    "enteredAccounts": [
      {
        "id": "77cf43a6403b0aca338192ec",
        "ownerIndex": 0,
        "kind": "traditional-ira",
        "valueToday": 800000,
        "manualBlend": {
          "kind": "exact",
          "stockPct": 60,
          "bondPct": 35,
          "cashPct": 5
        }
      },
      {
        "id": "14d50bd7cbd17aa128181573",
        "ownerIndex": 1,
        "kind": "brokerage",
        "valueToday": 250000,
        "basis": 180000,
        "manualBlend": {
          "kind": "exact",
          "stockPct": 70,
          "bondPct": 25,
          "cashPct": 5
        }
      }
    ],
    "incomeStreams": [
      {
        "ownerIndex": 1,
        "annualRealToday": 18000,
        "startAge": 70,
        "colaMode": "nominal-flat",
        "survivorPct": 0.5,
        "type": "pension"
      }
    ],
    "tickerClassifications": {},
    "health": {
      "enrolledPremiumMonthlyToday": 1100,
      "slcspMonthlyToday": 950,
      "oopMedicalAnnual": 4000,
      "irmaaMagiSeed": [
        120000,
        115000
      ]
    },
    "spendEntryPeriod": "month",
    "survivorSpendingRatio": 0.75,
    "drawdownPolicy": "proportional",
    "filing": "mfj",
    "startCalendarYear": 2026,
    "taxVintage": "OBBBA-2025",
    "appDefaultVersion": "p2-d1",
    "retirementState": "PA",
    "annualSpendingReal": 90000,
    "medicareExtrasByPerson": [
      {
        "kind": "typical",
        "adoptionVintage": "extras-2026b"
      },
      {
        "kind": "none"
      }
    ]
  },
  "working": {
    "people": [
      {
        "name": "Alex",
        "birthYear": 1968,
        "currentAge": 58,
        "sex": "male",
        "workStatus": "working",
        "earnedIncomeReal": 150000,
        "pia": 36000,
        "socialSecurityClaimAge": 67
      },
      {
        "name": "Sam",
        "birthYear": 1965,
        "currentAge": 61,
        "sex": "female",
        "workStatus": "retired",
        "earnedIncomeReal": 0,
        "retirementAge": 58,
        "pia": 18000,
        "socialSecurityClaimAge": 67
      }
    ],
    "enteredAccounts": [
      {
        "id": "81fa4f159f280adf4a34b0ba",
        "ownerIndex": 0,
        "kind": "401k",
        "valueToday": 600000,
        "annualContribution": 23000,
        "employerMatchAnnual": 6000,
        "manualBlend": {
          "kind": "exact",
          "stockPct": 80,
          "bondPct": 20,
          "cashPct": 0
        }
      }
    ],
    "incomeStreams": [],
    "tickerClassifications": {},
    "health": {
      "enrolledPremiumMonthlyToday": 900,
      "slcspMonthlyToday": 800,
      "employerPlanCoversRetiredMember": true,
      "oopMedicalAnnual": 3000,
      "workingYearInvestmentByPerson": [
        5000,
        0
      ]
    },
    "spendEntryPeriod": "year",
    "survivorSpendingRatio": 0.75,
    "drawdownPolicy": "proportional",
    "filing": "mfj",
    "startCalendarYear": 2026,
    "taxVintage": "OBBBA-2025",
    "appDefaultVersion": "p2-d1",
    "retirementState": "NC",
    "annualSpendingReal": 96000,
    "workingYearCost": {
      "kind": "entered",
      "amountReal": 90000,
      "entryPeriod": "year",
      "stateTaxReading": "agi-derived"
    },
    "workingYearLeftOver": {
      "kind": "saved",
      "quotedReal": 9795
    }
  }
}

export const WALK_PARITY: Readonly<Record<string, { readonly start: ScenarioDraft; readonly walked: ScenarioDraft }>> = {
  "person": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    },
    "walked": {
      "people": [
        {
          "name": "Alexis",
          "sex": "female",
          "birthYear": 1958,
          "currentAge": 68,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    }
  },
  "workToRetired": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "retired",
          "earnedIncomeReal": 0,
          "pia": 28000,
          "socialSecurityClaimAge": 67,
          "retirementAge": 57
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    }
  },
  "retiredToWorking": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "working",
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    }
  },
  "state": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "retirementState": "PA"
    }
  },
  "salary": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 160000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    }
  },
  "socialSecurity": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 25800,
          "socialSecurityClaimAge": 68
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    }
  },
  "workInvest": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          35000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    }
  },
  "pension": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [
        {
          "ownerIndex": 0,
          "annualRealToday": 18000,
          "startAge": 70,
          "colaMode": "nominal-flat",
          "survivorPct": 0.5,
          "type": "pension"
        }
      ],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    }
  },
  "accountDeposits": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "valueToday": 900000,
          "annualContribution": 22000,
          "employerMatchAnnual": 6000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    }
  },
  "newBrokerage": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        },
        {
          "id": "2fe28981410dfc39859150a1",
          "ownerIndex": 0,
          "kind": "brokerage",
          "valueToday": 250000,
          "basis": 180000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 70,
            "bondPct": 25,
            "cashPct": 5
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    }
  },
  "spend": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 7500,
      "spendEntryPeriod": "year",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    }
  },
  "budget": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "retired",
          "retirementAge": 65,
          "earnedIncomeReal": 0,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 1120000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          80000,
          80000
        ]
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 220
        },
        {
          "kind": "none"
        }
      ],
      "annualSpendingReal": 24000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "budget": [
        {
          "id": "ef9968e3319acc957f51d09a",
          "category": "other",
          "label": "",
          "annualAmountReal": 24000,
          "tier": "essentials",
          "startYear": 0
        }
      ]
    }
  },
  "oopUnderBudget": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1958,
          "currentAge": 68,
          "workStatus": "retired",
          "retirementAge": 64,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1956,
          "currentAge": 70,
          "workStatus": "retired",
          "retirementAge": 66,
          "earnedIncomeReal": 0,
          "pia": 16000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 760000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 55,
            "bondPct": 35,
            "cashPct": 10
          }
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "valueToday": 70000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 70,
            "bondPct": 25,
            "cashPct": 5
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          40000,
          40000
        ],
        "oopMedicalAnnual": 6000
      },
      "annualSpendingReal": 65600,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "budget": [
        {
          "id": "line-housing",
          "category": "housing",
          "label": "Mortgage & taxes",
          "annualAmountReal": 18000,
          "tier": "essentials",
          "startYear": 0
        },
        {
          "id": "line-utilities",
          "category": "utilities",
          "label": "",
          "annualAmountReal": 4800,
          "tier": "essentials",
          "startYear": 0
        },
        {
          "id": "line-food",
          "category": "food",
          "label": "Groceries",
          "annualAmountReal": 9600,
          "tier": "essentials",
          "startYear": 0
        },
        {
          "id": "line-transportation",
          "category": "transportation",
          "label": "",
          "annualAmountReal": 4800,
          "tier": "essentials",
          "startYear": 0
        },
        {
          "id": "line-other",
          "category": "other",
          "label": "Everything else",
          "annualAmountReal": 4400,
          "tier": "essentials",
          "startYear": 0
        },
        {
          "id": "line-travel",
          "category": "travel",
          "label": "See the kids",
          "annualAmountReal": 12000,
          "tier": "discretionary",
          "startYear": 0
        },
        {
          "id": "line-gifts",
          "category": "gifts",
          "label": "",
          "annualAmountReal": 6000,
          "tier": "discretionary",
          "startYear": 0
        }
      ]
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1958,
          "currentAge": 68,
          "workStatus": "retired",
          "retirementAge": 64,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1956,
          "currentAge": 70,
          "workStatus": "retired",
          "retirementAge": 66,
          "earnedIncomeReal": 0,
          "pia": 16000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 760000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 55,
            "bondPct": 35,
            "cashPct": 10
          }
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "valueToday": 70000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 70,
            "bondPct": 25,
            "cashPct": 5
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          40000,
          40000
        ],
        "oopMedicalAnnual": 6000
      },
      "annualSpendingReal": 65600,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "budget": [
        {
          "id": "line-housing",
          "category": "housing",
          "label": "Mortgage & taxes",
          "annualAmountReal": 18000,
          "tier": "essentials",
          "startYear": 0
        },
        {
          "id": "line-utilities",
          "category": "utilities",
          "label": "",
          "annualAmountReal": 4800,
          "tier": "essentials",
          "startYear": 0
        },
        {
          "id": "line-food",
          "category": "food",
          "label": "Groceries",
          "annualAmountReal": 9600,
          "tier": "essentials",
          "startYear": 0
        },
        {
          "id": "line-transportation",
          "category": "transportation",
          "label": "",
          "annualAmountReal": 4800,
          "tier": "essentials",
          "startYear": 0
        },
        {
          "id": "line-other",
          "category": "other",
          "label": "Everything else",
          "annualAmountReal": 4400,
          "tier": "essentials",
          "startYear": 0
        },
        {
          "id": "line-travel",
          "category": "travel",
          "label": "See the kids",
          "annualAmountReal": 12000,
          "tier": "discretionary",
          "startYear": 0
        },
        {
          "id": "line-gifts",
          "category": "gifts",
          "label": "",
          "annualAmountReal": 6000,
          "tier": "discretionary",
          "startYear": 0
        }
      ]
    }
  },
  "healthQuote": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1965,
          "currentAge": 61,
          "workStatus": "retired",
          "retirementAge": 60,
          "earnedIncomeReal": 0,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1967,
          "currentAge": 59,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 22000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-brokerage",
          "ownerIndex": 0,
          "kind": "brokerage",
          "valueToday": 900000,
          "basis": 800000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 35,
            "cashPct": 5
          }
        },
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 900000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "valueToday": 150000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 70,
            "bondPct": 25,
            "cashPct": 5
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1600,
        "slcspMonthlyToday": 1400,
        "oopMedicalAnnual": 4000
      },
      "rothConversion": {
        "annualAmountReal": 20000,
        "startYearOffset": 0,
        "years": 4
      },
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "year",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1965,
          "currentAge": 61,
          "workStatus": "retired",
          "retirementAge": 60,
          "earnedIncomeReal": 0,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1967,
          "currentAge": 59,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 22000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-brokerage",
          "ownerIndex": 0,
          "kind": "brokerage",
          "valueToday": 900000,
          "basis": 800000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 35,
            "cashPct": 5
          }
        },
        {
          "id": "acct-0-traditional-ira",
          "ownerIndex": 0,
          "kind": "traditional-ira",
          "valueToday": 900000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 60,
            "bondPct": 30,
            "cashPct": 10
          }
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "valueToday": 150000,
          "manualBlend": {
            "kind": "exact",
            "stockPct": 70,
            "bondPct": 25,
            "cashPct": 5
          }
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1250,
        "slcspMonthlyToday": 1050,
        "oopMedicalAnnual": 4000
      },
      "rothConversion": {
        "annualAmountReal": 20000,
        "startYearOffset": 0,
        "years": 4
      },
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "year",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589
    }
  },
  "coverage": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": false
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    }
  },
  "medicare": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "working",
          "earnedIncomeReal": 120000,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 1300000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 250000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          90000,
          90000
        ],
        "workingYearInvestmentByPerson": [
          15000,
          0
        ]
      },
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 78000,
        "stateTaxReading": "unpriced"
      }
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "male",
          "birthYear": 1960,
          "currentAge": 66,
          "workStatus": "working",
          "earnedIncomeReal": 120000,
          "pia": 30000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "female",
          "birthYear": 1961,
          "currentAge": 65,
          "workStatus": "retired",
          "retirementAge": 63,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 1300000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 250000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "irmaaMagiSeed": [
          180000,
          175000
        ],
        "workingYearInvestmentByPerson": [
          15000,
          0
        ]
      },
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 78000,
        "stateTaxReading": "unpriced"
      },
      "medicareExtrasByPerson": [
        {
          "kind": "entered",
          "monthly": 250
        },
        {
          "kind": "unanswered"
        }
      ]
    }
  },
  "workingCostStaleYes": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 78000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 78000,
        "stateTaxReading": "unpriced"
      }
    }
  },
  "workingCostOwnFigure": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "entered",
        "amountReal": 90000,
        "entryPeriod": "year",
        "stateTaxReading": "unpriced"
      }
    }
  },
  "leftOverSaved": {
    "start": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      }
    },
    "walked": {
      "people": [
        {
          "name": "Alex",
          "sex": "female",
          "birthYear": 1968,
          "currentAge": 58,
          "workStatus": "working",
          "earnedIncomeReal": 150000,
          "pia": 28000,
          "socialSecurityClaimAge": 67
        },
        {
          "name": "Sam",
          "sex": "male",
          "birthYear": 1966,
          "currentAge": 60,
          "workStatus": "retired",
          "retirementAge": 58,
          "earnedIncomeReal": 0,
          "pia": 24000,
          "socialSecurityClaimAge": 67
        }
      ],
      "enteredAccounts": [
        {
          "id": "acct-0-401k",
          "ownerIndex": 0,
          "kind": "401k",
          "ticker": "VTI",
          "valueToday": 900000,
          "annualContribution": 20000,
          "employerMatchAnnual": 8000
        },
        {
          "id": "acct-1-roth-ira",
          "ownerIndex": 1,
          "kind": "roth-ira",
          "ticker": "VFIFX",
          "valueToday": 200000
        }
      ],
      "incomeStreams": [],
      "tickerClassifications": {},
      "health": {
        "enrolledPremiumMonthlyToday": 1100,
        "slcspMonthlyToday": 1000,
        "workingYearInvestmentByPerson": [
          30000,
          0
        ],
        "employerPlanCoversRetiredMember": true
      },
      "annualSpendingReal": 84000,
      "spendEntryPeriod": "month",
      "survivorSpendingRatio": 0.75,
      "drawdownPolicy": "proportional",
      "filing": "mfj",
      "startCalendarYear": 2026,
      "taxVintage": "OBBBA-2025",
      "appDefaultVersion": "p2-dev-seed",
      "seed": 12245589,
      "workingYearCost": {
        "kind": "confirmed",
        "quotedReal": 84000,
        "stateTaxReading": "unpriced"
      },
      "workingYearLeftOver": {
        "kind": "saved",
        "quotedReal": 16985
      }
    }
  }
}
