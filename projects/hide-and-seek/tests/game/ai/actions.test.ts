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

  it('push and process MOVE_TO', () => {
    const q = new ActionQueue();
    q.push({ type: 'MOVE_TO', targetX: 5, targetY: 7 });
    expect(q.isEmpty()).toBe(false);
    expect(q.length).toBe(1);
    expect(q.current!.type).toBe('MOVE_TO');
  });

  it('push and process OPEN_DOOR', () => {
    const q = new ActionQueue();
    q.push({ type: 'OPEN_DOOR', doorId: 'door_1' as DoorId });
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

  it('full sequence: OPEN_DOOR → WAIT → REQUEST_PATH', () => {
    const q = new ActionQueue();
    q.push(
      { type: 'OPEN_DOOR', doorId: 'door_1' as DoorId },
      { type: 'WAIT', ticksRemaining: 3 },
      { type: 'REQUEST_PATH', targetX: 10, targetY: 10 },
    );
    expect(q.length).toBe(3);

    // Process OPEN_DOOR
    expect(q.current!.type).toBe('OPEN_DOOR');
    q.shift();

    // Process WAIT
    expect(q.current!.type).toBe('WAIT');
    q.shift();

    // Process REQUEST_PATH
    expect(q.current!.type).toBe('REQUEST_PATH');
    q.shift();

    expect(q.isEmpty()).toBe(true);
  });

  it('clear empties the queue', () => {
    const q = new ActionQueue();
    q.push(
      { type: 'MOVE_TO', targetX: 5, targetY: 7 },
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
