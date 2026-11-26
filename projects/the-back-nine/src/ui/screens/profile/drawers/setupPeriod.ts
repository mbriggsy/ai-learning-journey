/**
 * src/ui/screens/profile/drawers/setupPeriod.ts: the spending period's provenance while the drawers run inside the
 * first-run stepper (Act 6 · RC14; `drawerSave.ts`'s header). The stepper provides it; the shell provides none, so a
 * drawer reading `null` is after setup. Neither is the whole receipt (milestone 3's review, X2): the Living expenses
 * drawer ANDs `periodConfirmed` with the plan's shape at open (a one-figure amount no budget governs), because setup's
 * Complete passes with no figure under a governing budget.
 *
 * `periodConfirmed` is the stepper's provenance (a vault or an applied dev seed answered the period before the plan could
 * be saved; `IntakeApp` passes it as it passed the walk's). `spendPeriodAnswered` is this session's answer: the walk kept
 * it as the touched entry `spendEntryPeriod` for the flow's life; the stepper keeps it here for its own, set by the Living
 * expenses drawer's Save once its unit was tapped (or its worksheet, whose lines are yearly, applied).
 */
import { createContext, useContext } from 'react'
import type { SpendPeriodSetup } from './drawerSave'

export interface SetupPeriod extends SpendPeriodSetup {
  /** The Living expenses drawer saved with its unit answered. */
  readonly markSpendPeriodAnswered: () => void
}

export const SetupPeriodContext = createContext<SetupPeriod | null>(null)

/** The stepper's period provenance, or null after setup. */
export const useSetupPeriod = (): SetupPeriod | null => useContext(SetupPeriodContext)
