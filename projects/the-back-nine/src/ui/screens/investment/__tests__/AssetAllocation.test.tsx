// @vitest-environment jsdom
/**
 * Investment → Asset Allocation's Detail tab: its Current column reads the accounts shown, so the picker that sets them
 * stands on Detail too, bound to the same scope (milestone 2's review: the picker lived on Summary only, and Detail's
 * Current column read a narrowed mix while naming no scope).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { AssetAllocation } from '../AssetAllocation'
import { assetAllocationView } from '../investmentView'

afterEach(cleanup)

const d: ScenarioDraft = DEV_SEEDS.buckets

describe('Asset Allocation — Detail', () => {
  it('draws the scope picker over its table, showing the scope its Current column reads', () => {
    const scope = assetAllocationView({ draft: d, scope: 'all', whatIf: { name: copy.probabilityPickNew, levers: [] } })
    if (scope.kind !== 'mix') throw new Error('expected a mix')
    const narrowed = scope.scopes.find((s) => s.value !== 'all')
    if (narrowed === undefined) throw new Error('the seed offers no narrower scope')
    const view = assetAllocationView({ draft: d, scope: narrowed.value, whatIf: { name: copy.probabilityPickNew, levers: [] } })
    render(<AssetAllocation headingRef={{ current: null }} view={view} tab="detail" onTab={vi.fn()} onScope={vi.fn()} onTryMix={vi.fn()} caveat={[]} />)
    const picker = screen.getByRole('combobox', { name: copy.assetScopeLabel })
    expect(picker).toHaveTextContent(narrowed.label)
    expect(screen.getByText(slots.assetOneMixLine(scope.current.pcts.stock))).toBeInTheDocument()
  })
})
