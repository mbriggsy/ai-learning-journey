import { describe, it, expect } from 'vitest';
import { createInputHandler } from '../../src/game/input';

describe('createInputHandler', () => {
  it('defaults to no input', () => {
    const handler = createInputHandler();
    const input = handler.read();
    expect(input.direction).toBe(0);
    expect(input.shift).toBe(false);
    expect(input.ctrl).toBe(false);
    expect(input.jump).toBe(false);
    expect(input.slide).toBe(false);
    expect(input.interact).toBe(false);
  });

  it('right arrow sets direction to 1', () => {
    const handler = createInputHandler();
    handler.setKey('ArrowRight', true);
    expect(handler.read().direction).toBe(1);
  });

  it('left arrow sets direction to -1', () => {
    const handler = createInputHandler();
    handler.setKey('ArrowLeft', true);
    expect(handler.read().direction).toBe(-1);
  });

  it('WASD keys work (D = right, A = left)', () => {
    const handler = createInputHandler();
    handler.setKey('KeyD', true);
    expect(handler.read().direction).toBe(1);

    handler.reset();
    handler.setKey('KeyA', true);
    expect(handler.read().direction).toBe(-1);
  });

  it('shift modifier for running', () => {
    const handler = createInputHandler();
    handler.setKey('ShiftLeft', true);
    expect(handler.read().shift).toBe(true);

    handler.reset();
    handler.setKey('ShiftRight', true);
    expect(handler.read().shift).toBe(true);
  });

  it('ctrl modifier for sneaking', () => {
    const handler = createInputHandler();
    handler.setKey('ControlLeft', true);
    expect(handler.read().ctrl).toBe(true);
  });

  it('space for jump', () => {
    const handler = createInputHandler();
    handler.setKey('Space', true);
    expect(handler.read().jump).toBe(true);
  });

  it('down arrow / S for slide', () => {
    const handler = createInputHandler();
    handler.setKey('ArrowDown', true);
    expect(handler.read().slide).toBe(true);

    handler.reset();
    handler.setKey('KeyS', true);
    expect(handler.read().slide).toBe(true);
  });

  it('E for interact', () => {
    const handler = createInputHandler();
    handler.setKey('KeyE', true);
    expect(handler.read().interact).toBe(true);
  });

  it('multiple simultaneous keys (shift + direction = run input)', () => {
    const handler = createInputHandler();
    handler.setKey('ShiftLeft', true);
    handler.setKey('ArrowRight', true);
    const input = handler.read();
    expect(input.shift).toBe(true);
    expect(input.direction).toBe(1);
  });

  it('reset clears all key state', () => {
    const handler = createInputHandler();
    handler.setKey('ArrowRight', true);
    handler.setKey('ShiftLeft', true);
    handler.reset();
    const input = handler.read();
    expect(input.direction).toBe(0);
    expect(input.shift).toBe(false);
  });

  it('key release via setKey(code, false)', () => {
    const handler = createInputHandler();
    handler.setKey('Space', true);
    expect(handler.read().jump).toBe(true);
    handler.setKey('Space', false);
    expect(handler.read().jump).toBe(false);
  });
});
