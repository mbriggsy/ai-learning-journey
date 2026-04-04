import { describe, it, expect, vi } from 'vitest';
import { createMonologueSystem } from '../../src/game/monologue';
import type { MonologueTrigger, MonologueContext } from '../../src/game/monologue';
import { createEmitter } from '../../src/game/events';
import type { GameEventMap } from '../../src/types/events';

const BASE_CTX: MonologueContext = {
  currentNight: 1,
  currentZone: 'lobby-main',
  monstersNearby: [],
  firstSightings: new Set(),
};

function makeTrigger(overrides: Partial<MonologueTrigger> & { id: string }): MonologueTrigger {
  return {
    lines: ['Test line.'],
    cooldownS: 0,
    priority: 5,
    check: () => true,
    ...overrides,
  };
}

function makeSetup(triggers: MonologueTrigger[] = []) {
  const emitter = createEmitter<GameEventMap>();
  const system = createMonologueSystem(triggers, emitter);
  return { emitter, system };
}

describe('createMonologueSystem', () => {
  it('starts with no active line', () => {
    const { system } = makeSetup();
    expect(system.activeLine).toBeNull();
  });

  it('shows line when trigger check passes', () => {
    const trigger = makeTrigger({ id: 'test', check: () => true });
    const { system } = makeSetup([trigger]);
    system.update(0.016, BASE_CTX);
    expect(system.activeLine).toBe('Test line.');
  });

  it('does not show line when check fails', () => {
    const trigger = makeTrigger({ id: 'test', check: () => false });
    const { system } = makeSetup([trigger]);
    system.update(0.016, BASE_CTX);
    expect(system.activeLine).toBeNull();
  });

  it('emits MONOLOGUE_SHOW when triggered', () => {
    const trigger = makeTrigger({ id: 'test' });
    const { emitter, system } = makeSetup([trigger]);
    const fn = vi.fn();
    emitter.on('MONOLOGUE_SHOW', fn);
    system.update(0.016, BASE_CTX);
    expect(fn).toHaveBeenCalledWith('Test line.');
  });

  it('line clears after display duration', () => {
    const trigger = makeTrigger({ id: 'test', check: () => true, cooldownS: 30 });
    const { emitter, system } = makeSetup([trigger]);
    system.update(0.016, BASE_CTX);
    expect(system.activeLine).toBe('Test line.');

    const hideFn = vi.fn();
    emitter.on('MONOLOGUE_HIDE', hideFn);
    system.update(4, BASE_CTX); // display duration is 3s
    expect(system.activeLine).toBeNull();
    expect(hideFn).toHaveBeenCalled();
  });

  it('respects cooldown — does not re-trigger', () => {
    let callCount = 0;
    const trigger = makeTrigger({
      id: 'test',
      cooldownS: 10,
      check: () => { callCount++; return true; },
    });
    const { emitter, system } = makeSetup([trigger]);
    const fn = vi.fn();
    emitter.on('MONOLOGUE_SHOW', fn);

    system.update(0.016, BASE_CTX); // triggers
    expect(fn).toHaveBeenCalledTimes(1);

    system.update(4, BASE_CTX); // line clears
    system.update(0.016, BASE_CTX); // cooldown still active
    expect(fn).toHaveBeenCalledTimes(1); // no re-trigger
  });

  it('re-triggers after cooldown expires', () => {
    const trigger = makeTrigger({ id: 'test', cooldownS: 5 });
    const { emitter, system } = makeSetup([trigger]);
    const fn = vi.fn();
    emitter.on('MONOLOGUE_SHOW', fn);

    system.update(0.016, BASE_CTX); // triggers
    system.update(4, BASE_CTX); // line clears (3s display)
    system.update(3, BASE_CTX); // cooldown expires (5s total from trigger)
    system.update(0.016, BASE_CTX); // re-triggers
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('higher priority overrides active line', () => {
    const low = makeTrigger({ id: 'low', priority: 3, lines: ['Low.'], cooldownS: 30 });
    const high = makeTrigger({ id: 'high', priority: 8, lines: ['High.'], check: () => false, cooldownS: 30 });
    const { system } = makeSetup([low, high]);

    system.update(0.016, BASE_CTX); // low triggers
    expect(system.activeLine).toBe('Low.');

    // Now high becomes true
    (high as any).check = () => true;
    system.update(0.016, BASE_CTX);
    expect(system.activeLine).toBe('High.');
  });

  it('lower priority does not override active line', () => {
    const high = makeTrigger({ id: 'high', priority: 8, lines: ['High.'], cooldownS: 30 });
    const low = makeTrigger({ id: 'low', priority: 3, lines: ['Low.'] });
    const { system } = makeSetup([high, low]);

    system.update(0.016, BASE_CTX); // high triggers
    expect(system.activeLine).toBe('High.');
    // Low can't override because priority is lower
    system.update(0.016, BASE_CTX);
    expect(system.activeLine).toBe('High.');
  });

  it('monster proximity trigger works', () => {
    const trigger = makeTrigger({
      id: 'bellhop-near',
      check: (ctx) => ctx.monstersNearby.includes('bellhop'),
    });
    const { system } = makeSetup([trigger]);

    system.update(0.016, BASE_CTX); // no monster nearby
    expect(system.activeLine).toBeNull();

    system.update(0.016, { ...BASE_CTX, monstersNearby: ['bellhop'] });
    expect(system.activeLine).toBe('Test line.');
  });

  it('zone-based trigger works', () => {
    const trigger = makeTrigger({
      id: 'basement',
      check: (ctx) => ctx.currentZone.startsWith('basement'),
    });
    const { system } = makeSetup([trigger]);

    system.update(0.016, BASE_CTX);
    expect(system.activeLine).toBeNull();

    system.update(0.016, { ...BASE_CTX, currentZone: 'basement-kitchen' });
    expect(system.activeLine).toBe('Test line.');
  });

  it('night-specific trigger works', () => {
    const trigger = makeTrigger({
      id: 'night5',
      check: (ctx) => ctx.currentNight === 5,
    });
    const { system } = makeSetup([trigger]);

    system.update(0.016, BASE_CTX); // night 1
    expect(system.activeLine).toBeNull();

    system.update(0.016, { ...BASE_CTX, currentNight: 5 });
    expect(system.activeLine).toBe('Test line.');
  });

  it('first sighting trigger works', () => {
    const trigger = makeTrigger({
      id: 'first-bellhop',
      check: (ctx) => ctx.firstSightings.has('bellhop'),
    });
    const { system } = makeSetup([trigger]);

    system.update(0.016, BASE_CTX);
    expect(system.activeLine).toBeNull();

    system.update(0.016, { ...BASE_CTX, firstSightings: new Set(['bellhop']) });
    expect(system.activeLine).toBe('Test line.');
  });

  it('zero cooldown allows immediate re-trigger after display clears', () => {
    const trigger = makeTrigger({ id: 'test', cooldownS: 0 });
    const { emitter, system } = makeSetup([trigger]);
    const fn = vi.fn();
    emitter.on('MONOLOGUE_SHOW', fn);

    system.update(0.016, BASE_CTX); // triggers
    system.update(4, BASE_CTX); // clears
    system.update(0.016, BASE_CTX); // re-triggers immediately
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
