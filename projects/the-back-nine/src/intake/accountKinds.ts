/**
 * An account kind's display name (copy-routed; the stored value stays the model enum). Moved out of
 * `AccountEntry.tsx` by Act 6's RC0, unchanged.
 */
import { copy, type CopyKey } from '@ui/copy'
import type { AccountKind } from '@shared/model'

const KIND_LABELS: Readonly<Record<AccountKind, CopyKey>> = {
  '401k': 'kind401k',
  '403b': 'kind403b',
  'traditional-ira': 'kindTraditionalIra',
  'roth-401k': 'kindRoth401k',
  'roth-ira': 'kindRothIra',
  brokerage: 'kindBrokerage',
  hsa: 'kindHsa',
}

export const kindLabel = (kind: AccountKind): string => copy[KIND_LABELS[kind]]
