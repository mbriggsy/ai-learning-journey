import { describe, it, expect } from 'vitest';
import { selectTool, canUseTool } from '../../src/game/tools/tool-selection';

describe('selectTool', () => {
  it('key 1 selects throwable', () => {
    expect(selectTool(1, null)).toBe('throwable');
  });

  it('key 2 selects dndSign', () => {
    expect(selectTool(2, null)).toBe('dndSign');
  });

  it('key 3 selects lighter', () => {
    expect(selectTool(3, null)).toBe('lighter');
  });

  it('pressing same key deselects (toggle off)', () => {
    expect(selectTool(1, 'throwable')).toBeNull();
    expect(selectTool(2, 'dndSign')).toBeNull();
    expect(selectTool(3, 'lighter')).toBeNull();
  });

  it('pressing different key switches tool', () => {
    expect(selectTool(2, 'throwable')).toBe('dndSign');
    expect(selectTool(3, 'throwable')).toBe('lighter');
    expect(selectTool(1, 'lighter')).toBe('throwable');
  });

  it('unknown key preserves current selection', () => {
    expect(selectTool(4, 'throwable')).toBe('throwable');
    expect(selectTool(0, null)).toBeNull();
    expect(selectTool(9, 'lighter')).toBe('lighter');
  });
});

describe('canUseTool', () => {
  it('allowed during idle', () => {
    expect(canUseTool('idle')).toBe(true);
  });

  it('allowed during walk', () => {
    expect(canUseTool('walk')).toBe(true);
  });

  it('allowed during sneak', () => {
    expect(canUseTool('sneak')).toBe(true);
  });

  it('blocked during run', () => {
    expect(canUseTool('run')).toBe(false);
  });

  it('blocked during slide', () => {
    expect(canUseTool('slide')).toBe(false);
  });

  it('blocked during jump', () => {
    expect(canUseTool('jump')).toBe(false);
  });
});
