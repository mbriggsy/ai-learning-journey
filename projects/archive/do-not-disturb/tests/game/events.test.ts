import { describe, it, expect, vi } from 'vitest';
import { createEmitter } from '../../src/game/events';

type TestEventMap = {
  readonly PING: readonly [value: number];
  readonly PONG: readonly [message: string, code: number];
  readonly EMPTY: readonly [];
};

function makeEmitter() {
  return createEmitter<TestEventMap>();
}

describe('createEmitter', () => {
  it('fires registered listeners with correct args', () => {
    const emitter = makeEmitter();
    const fn = vi.fn();
    emitter.on('PING', fn);
    emitter.emit('PING', 42);
    expect(fn).toHaveBeenCalledWith(42);
  });

  it('fires multiple listeners for the same event', () => {
    const emitter = makeEmitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    emitter.on('PING', fn1);
    emitter.on('PING', fn2);
    emitter.emit('PING', 7);
    expect(fn1).toHaveBeenCalledWith(7);
    expect(fn2).toHaveBeenCalledWith(7);
  });

  it('passes multiple args correctly', () => {
    const emitter = makeEmitter();
    const fn = vi.fn();
    emitter.on('PONG', fn);
    emitter.emit('PONG', 'hello', 200);
    expect(fn).toHaveBeenCalledWith('hello', 200);
  });

  it('handles events with no args', () => {
    const emitter = makeEmitter();
    const fn = vi.fn();
    emitter.on('EMPTY', fn);
    emitter.emit('EMPTY');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('off removes a listener', () => {
    const emitter = makeEmitter();
    const fn = vi.fn();
    emitter.on('PING', fn);
    emitter.off('PING', fn);
    emitter.emit('PING', 1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('listener removing itself during emit does not skip others', () => {
    const emitter = makeEmitter();
    const order: string[] = [];

    const selfRemover = () => {
      order.push('selfRemover');
      emitter.off('PING', selfRemover);
    };
    const survivor = () => {
      order.push('survivor');
    };

    emitter.on('PING', selfRemover);
    emitter.on('PING', survivor);
    emitter.emit('PING', 0);

    expect(order).toEqual(['selfRemover', 'survivor']);
  });

  it('offAll clears everything', () => {
    const emitter = makeEmitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    emitter.on('PING', fn1);
    emitter.on('PONG', fn2);
    emitter.offAll();
    emitter.emit('PING', 1);
    emitter.emit('PONG', 'x', 0);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it('emit with no listeners is a no-op', () => {
    const emitter = makeEmitter();
    expect(() => emitter.emit('PING', 99)).not.toThrow();
  });
});
