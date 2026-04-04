import { describe, it, expect, vi } from 'vitest';
import { createLighter } from '../../src/game/tools/lighter';
import type { MutableLighterInventory } from '../../src/game/tools/lighter';
import { createEmitter } from '../../src/game/events';
import { INVENTORY, NOISE } from '../../src/constants';
import type { GameEventMap } from '../../src/types/events';

function makeSetup(fuel: number = INVENTORY.LIGHTER_CHARGE_S, charges: number = 1) {
  const emitter = createEmitter<GameEventMap>();
  const lighter = createLighter(emitter);
  const inventory: MutableLighterInventory = { lighterFuel: fuel, lighterCharges: charges };
  return { emitter, lighter, inventory };
}

const POS = { x: 100, y: 50 };
const ZONE = 'room-a';

describe('createLighter', () => {
  it('starts inactive', () => {
    const { lighter } = makeSetup();
    expect(lighter.isActive).toBe(false);
  });

  it('ignite activates the lighter', () => {
    const { lighter, inventory } = makeSetup();
    lighter.ignite(inventory, POS, ZONE);
    expect(lighter.isActive).toBe(true);
  });

  it('ignite emits noise event (flick sound)', () => {
    const { emitter, lighter, inventory } = makeSetup();
    const fn = vi.fn();
    emitter.on('NOISE_EMITTED', fn);
    lighter.ignite(inventory, POS, ZONE);
    expect(fn).toHaveBeenCalledWith({
      sourceZoneId: ZONE,
      level: NOISE.LIGHTER_FLICK_LEVEL,
      position: POS,
    });
  });

  it('ignite emits LIGHTER_IGNITED event', () => {
    const { emitter, lighter, inventory } = makeSetup();
    const fn = vi.fn();
    emitter.on('LIGHTER_IGNITED', fn);
    lighter.ignite(inventory, POS, ZONE);
    expect(fn).toHaveBeenCalledWith(POS);
  });

  it('ignite emits TOOL_USED event', () => {
    const { emitter, lighter, inventory } = makeSetup();
    const fn = vi.fn();
    emitter.on('TOOL_USED', fn);
    lighter.ignite(inventory, POS, ZONE);
    expect(fn).toHaveBeenCalledWith('lighter', POS);
  });

  it('ignite does nothing when already active', () => {
    const { emitter, lighter, inventory } = makeSetup();
    lighter.ignite(inventory, POS, ZONE);
    const fn = vi.fn();
    emitter.on('NOISE_EMITTED', fn);
    lighter.ignite(inventory, POS, ZONE); // second ignite — should be no-op
    expect(fn).not.toHaveBeenCalled();
  });

  it('ignite does nothing when no fuel and no charges', () => {
    const { lighter, inventory } = makeSetup(0, 0);
    lighter.ignite(inventory, POS, ZONE);
    expect(lighter.isActive).toBe(false);
  });

  it('auto-refuels from charges when fuel is empty', () => {
    const { lighter, inventory } = makeSetup(0, 2);
    lighter.ignite(inventory, POS, ZONE);
    expect(lighter.isActive).toBe(true);
    expect(inventory.lighterCharges).toBe(1);
    expect(inventory.lighterFuel).toBe(INVENTORY.LIGHTER_CHARGE_S);
  });

  it('extinguish deactivates the lighter', () => {
    const { lighter, inventory } = makeSetup();
    lighter.ignite(inventory, POS, ZONE);
    lighter.extinguish();
    expect(lighter.isActive).toBe(false);
  });

  it('extinguish emits LIGHTER_EXTINGUISHED event', () => {
    const { emitter, lighter, inventory } = makeSetup();
    lighter.ignite(inventory, POS, ZONE);
    const fn = vi.fn();
    emitter.on('LIGHTER_EXTINGUISHED', fn);
    lighter.extinguish();
    expect(fn).toHaveBeenCalled();
  });

  it('extinguish is no-op when already inactive', () => {
    const { emitter, lighter } = makeSetup();
    const fn = vi.fn();
    emitter.on('LIGHTER_EXTINGUISHED', fn);
    lighter.extinguish();
    expect(fn).not.toHaveBeenCalled();
  });

  it('update consumes fuel over time', () => {
    const { lighter, inventory } = makeSetup(10, 0);
    lighter.ignite(inventory, POS, ZONE);
    lighter.update(3, inventory);
    expect(inventory.lighterFuel).toBeCloseTo(7);
  });

  it('update does nothing when inactive', () => {
    const { lighter, inventory } = makeSetup(10, 0);
    lighter.update(3, inventory);
    expect(inventory.lighterFuel).toBe(10);
  });

  it('auto-extinguishes when fuel runs out', () => {
    const { emitter, lighter, inventory } = makeSetup(5, 0);
    lighter.ignite(inventory, POS, ZONE);
    const fn = vi.fn();
    emitter.on('LIGHTER_EXTINGUISHED', fn);
    lighter.update(6, inventory); // burn past remaining fuel
    expect(lighter.isActive).toBe(false);
    expect(inventory.lighterFuel).toBe(0);
    expect(fn).toHaveBeenCalled();
  });

  it('fuel does not go negative', () => {
    const { lighter, inventory } = makeSetup(2, 0);
    lighter.ignite(inventory, POS, ZONE);
    lighter.update(10, inventory);
    expect(inventory.lighterFuel).toBe(0);
  });

  it('full lifecycle: ignite → burn → auto-extinguish → re-ignite from charge', () => {
    const { lighter, inventory } = makeSetup(5, 1);
    lighter.ignite(inventory, POS, ZONE);
    expect(lighter.isActive).toBe(true);
    expect(inventory.lighterCharges).toBe(1);

    // Burn through first charge
    lighter.update(6, inventory);
    expect(lighter.isActive).toBe(false);
    expect(inventory.lighterFuel).toBe(0);

    // Re-ignite from reserve charge
    lighter.ignite(inventory, POS, ZONE);
    expect(lighter.isActive).toBe(true);
    expect(inventory.lighterCharges).toBe(0);
    expect(inventory.lighterFuel).toBe(INVENTORY.LIGHTER_CHARGE_S);
  });
});
