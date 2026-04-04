import type { Position, ZoneId } from '../../types/state';
import type { Emitter } from '../events';
import { INVENTORY, NOISE } from '../../constants';

export type MutableLighterInventory = {
  lighterFuel: number;
  lighterCharges: number;
};

export function createLighter(emitter: Emitter) {
  let active = false;

  return {
    ignite(
      inventory: MutableLighterInventory,
      playerPosition: Position,
      playerZone: ZoneId,
    ) {
      if (active) return;
      if (inventory.lighterFuel <= 0 && inventory.lighterCharges <= 0) return;

      // Auto-refuel from next charge if current is empty
      if (inventory.lighterFuel <= 0 && inventory.lighterCharges > 0) {
        inventory.lighterCharges--;
        inventory.lighterFuel = INVENTORY.LIGHTER_CHARGE_S;
      }

      active = true;

      // Flick sound — Bellhop hears this
      emitter.emit('NOISE_EMITTED', {
        sourceZoneId: playerZone,
        level: NOISE.LIGHTER_FLICK_LEVEL,
        position: playerPosition,
      });

      emitter.emit('LIGHTER_IGNITED', playerPosition);
      emitter.emit('TOOL_USED', 'lighter', playerPosition);
    },

    extinguish() {
      if (!active) return;
      active = false;
      emitter.emit('LIGHTER_EXTINGUISHED');
    },

    update(dt: number, inventory: MutableLighterInventory) {
      if (!active) return;
      inventory.lighterFuel -= dt;
      if (inventory.lighterFuel <= 0) {
        inventory.lighterFuel = 0;
        active = false;
        emitter.emit('LIGHTER_EXTINGUISHED');
      }
    },

    get isActive() { return active; },
  };
}
