import { describe, it, expect } from 'vitest';
import { PathfindingSystem } from '../../../src/game/ai/pathfinding.js';

// Note: EasyStar doesn't resolve paths in node test env.
// Real pathfinding tested via browser/integration.
// These tests verify the multi-instance API structure.

function makeGrid(): Uint8Array {
  return new Uint8Array(100); // 10x10, all walkable
}

describe('PathfindingSystem multi-instance', () => {
  it('creates named instances', () => {
    const system = new PathfindingSystem();
    const seeker = system.createInstance('seeker', makeGrid(), 10, 10);
    const hider = system.createInstance('hider', makeGrid(), 10, 10);

    expect(seeker).toBeDefined();
    expect(hider).toBeDefined();
    expect(seeker).not.toBe(hider);
  });

  it('getInstance returns the created instance', () => {
    const system = new PathfindingSystem();
    const created = system.createInstance('seeker', makeGrid(), 10, 10);
    const retrieved = system.getInstance('seeker');
    expect(retrieved).toBe(created);
  });

  it('getInstance throws for unknown instance', () => {
    const system = new PathfindingSystem();
    expect(() => system.getInstance('nonexistent')).toThrow("no instance 'nonexistent'");
  });

  it('instances have requestPath, cancelPath, setDoorCost, removeDoorCost', () => {
    const system = new PathfindingSystem();
    const instance = system.createInstance('test', makeGrid(), 10, 10);

    expect(typeof instance.requestPath).toBe('function');
    expect(typeof instance.cancelPath).toBe('function');
    expect(typeof instance.setDoorCost).toBe('function');
    expect(typeof instance.removeDoorCost).toBe('function');
  });

  it('setDoorCostAll and removeDoorCostAll do not throw', () => {
    const system = new PathfindingSystem();
    system.createInstance('seeker', makeGrid(), 10, 10);
    system.createInstance('hider', makeGrid(), 10, 10);

    expect(() => system.setDoorCostAll(5, 5, 50)).not.toThrow();
    expect(() => system.removeDoorCostAll(5, 5)).not.toThrow();
  });

  it('calculate() does not throw with multiple instances', () => {
    const system = new PathfindingSystem();
    system.createInstance('seeker', makeGrid(), 10, 10);
    system.createInstance('hider', makeGrid(), 10, 10);

    expect(() => system.calculate()).not.toThrow();
  });
});
