import { describe, it, expect } from 'vitest';
import { saveTo, loadFrom, clearSave, updateHighestNight } from '../../src/game/save';
import type { Storage } from '../../src/game/save';

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); },
    removeItem: (key) => { store.delete(key); },
  };
}

describe('save system', () => {
  it('loadFrom returns default when no save exists', () => {
    const storage = createMockStorage();
    const data = loadFrom(storage);
    expect(data.highestNightCompleted).toBe(0);
    expect(data.version).toBe(1);
  });

  it('saveTo + loadFrom round-trips data', () => {
    const storage = createMockStorage();
    saveTo(storage, { highestNightCompleted: 3, version: 1 });
    const data = loadFrom(storage);
    expect(data.highestNightCompleted).toBe(3);
  });

  it('sentinel value 0 means no nights completed (insight 009)', () => {
    const storage = createMockStorage();
    const data = loadFrom(storage);
    expect(data.highestNightCompleted).toBe(0);
    // Verify it round-trips through JSON correctly (not Infinity/null)
    saveTo(storage, data);
    const reloaded = loadFrom(storage);
    expect(reloaded.highestNightCompleted).toBe(0);
  });

  it('loadFrom handles corrupt JSON gracefully', () => {
    const storage = createMockStorage();
    storage.setItem('dnd-save', 'not-json');
    const data = loadFrom(storage);
    expect(data.highestNightCompleted).toBe(0);
  });

  it('loadFrom handles missing fields gracefully', () => {
    const storage = createMockStorage();
    storage.setItem('dnd-save', '{}');
    const data = loadFrom(storage);
    expect(data.highestNightCompleted).toBe(0);
  });

  it('loadFrom clamps night to 0-5 range', () => {
    const storage = createMockStorage();
    storage.setItem('dnd-save', '{"highestNightCompleted": 99, "version": 1}');
    expect(loadFrom(storage).highestNightCompleted).toBe(5);

    storage.setItem('dnd-save', '{"highestNightCompleted": -3, "version": 1}');
    expect(loadFrom(storage).highestNightCompleted).toBe(0);
  });

  it('clearSave removes the save', () => {
    const storage = createMockStorage();
    saveTo(storage, { highestNightCompleted: 4, version: 1 });
    clearSave(storage);
    const data = loadFrom(storage);
    expect(data.highestNightCompleted).toBe(0);
  });

  it('updateHighestNight only updates when higher', () => {
    const storage = createMockStorage();
    saveTo(storage, { highestNightCompleted: 3, version: 1 });
    updateHighestNight(storage, 2); // lower, no change
    expect(loadFrom(storage).highestNightCompleted).toBe(3);
    updateHighestNight(storage, 4); // higher, updates
    expect(loadFrom(storage).highestNightCompleted).toBe(4);
  });

  it('updateHighestNight creates save if none exists', () => {
    const storage = createMockStorage();
    updateHighestNight(storage, 1);
    expect(loadFrom(storage).highestNightCompleted).toBe(1);
  });
});
