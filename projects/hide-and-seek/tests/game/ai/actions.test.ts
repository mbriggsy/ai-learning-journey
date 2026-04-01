import { describe, it, expect } from 'vitest';
import { ActionQueue } from '../../../src/game/ai/actions.js';
import type { DoorId } from '../../../src/types/state.js';

describe('ActionQueue', () => {
  it('starts empty', () => {
    const q = new ActionQueue();
    expect(q.isEmpty()).toBe(true);
    expect(q.length).toBe(0);
    expect(q.current).toBeUndefined();
  });

  it('push and process OPEN_DOOR', () => {
    const q = new ActionQueue();
    q.push({ type: 'OPEN_DOOR', doorId: 'door_1' as DoorId });
    expect(q.isEmpty()).toBe(false);
    expect(q.length).toBe(1);
    expect(q.current!.type).toBe('OPEN_DOOR');
    q.shift();
    expect(q.isEmpty()).toBe(true);
  });

  it('processes WAIT — decrements ticks', () => {
    const q = new ActionQueue();
    q.push({ type: 'WAIT', ticksRemaining: 3 });
    const action = q.current!;
    expect(action.type).toBe('WAIT');
    if (action.type === 'WAIT') {
      action.ticksRemaining--;
      expect(action.ticksRemaining).toBe(2);
      action.ticksRemaining--;
      action.ticksRemaining--;
      expect(action.ticksRemaining).toBe(0);
    }
  });

  it('full sequence: OPEN_DOOR → WAIT', () => {
    const q = new ActionQueue();
    q.push(
      { type: 'OPEN_DOOR', doorId: 'door_1' as DoorId },
      { type: 'WAIT', ticksRemaining: 3 },
    );
    expect(q.length).toBe(2);

    expect(q.current!.type).toBe('OPEN_DOOR');
    q.shift();

    expect(q.current!.type).toBe('WAIT');
    q.shift();

    expect(q.isEmpty()).toBe(true);
  });

  it('clear empties the queue', () => {
    const q = new ActionQueue();
    q.push(
      { type: 'OPEN_DOOR', doorId: 'door_1' as DoorId },
      { type: 'WAIT', ticksRemaining: 3 },
    );
    expect(q.length).toBe(2);
    q.clear();
    expect(q.isEmpty()).toBe(true);
  });

  it('empty queue shift returns undefined', () => {
    const q = new ActionQueue();
    expect(q.shift()).toBeUndefined();
  });
});
