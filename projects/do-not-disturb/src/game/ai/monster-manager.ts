import type { FSMRunner } from '../../types/fsm';

export type ManagedMonster = {
  readonly id: string;
  active: boolean;
  fsm: FSMRunner<any>;
};

export function updateMonsters(monsters: readonly ManagedMonster[], dt: number): void {
  for (const monster of monsters) {
    if (!monster.active) continue;
    monster.fsm.update(dt);
  }
}
