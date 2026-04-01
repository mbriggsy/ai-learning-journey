import { describe, it, expect } from 'vitest';
import { createTypedEmitter } from '../../src/game/events.js';

type TestEventMap = {
  foo: [value: number];
  bar: [a: string, b: boolean];
};

describe('TypedEmitter', () => {
  it('emits to registered listeners', () => {
    const emitter = createTypedEmitter<TestEventMap>();
    const received: number[] = [];
    emitter.on('foo', (v) => received.push(v));
    emitter.emit('foo', 42);
    expect(received).toEqual([42]);
  });

  it('supports multiple listeners per event', () => {
    const emitter = createTypedEmitter<TestEventMap>();
    const r1: number[] = [];
    const r2: number[] = [];
    emitter.on('foo', (v) => r1.push(v));
    emitter.on('foo', (v) => r2.push(v));
    emitter.emit('foo', 10);
    expect(r1).toEqual([10]);
    expect(r2).toEqual([10]);
  });

  it('passes multiple args', () => {
    const emitter = createTypedEmitter<TestEventMap>();
    let gotA = '';
    let gotB = false;
    emitter.on('bar', (a, b) => { gotA = a; gotB = b; });
    emitter.emit('bar', 'hello', true);
    expect(gotA).toBe('hello');
    expect(gotB).toBe(true);
  });

  it('off removes a specific listener', () => {
    const emitter = createTypedEmitter<TestEventMap>();
    const received: number[] = [];
    const handler = (v: number) => received.push(v);
    emitter.on('foo', handler);
    emitter.emit('foo', 1);
    emitter.off('foo', handler);
    emitter.emit('foo', 2);
    expect(received).toEqual([1]);
  });

  it('off with non-registered handler is a no-op', () => {
    const emitter = createTypedEmitter<TestEventMap>();
    const handler = (_v: number) => {};
    // Should not throw
    emitter.off('foo', handler);
  });

  it('offAll removes all listeners', () => {
    const emitter = createTypedEmitter<TestEventMap>();
    const received: number[] = [];
    emitter.on('foo', (v) => received.push(v));
    emitter.on('bar', () => {});
    emitter.offAll();
    emitter.emit('foo', 99);
    expect(received).toEqual([]);
  });

  it('emit with no listeners is a no-op', () => {
    const emitter = createTypedEmitter<TestEventMap>();
    // Should not throw
    emitter.emit('foo', 1);
  });

  it('copy-on-iterate: handler calling off() does not skip next handler', () => {
    const emitter = createTypedEmitter<TestEventMap>();
    const calls: string[] = [];

    const h1 = () => {
      calls.push('h1');
      emitter.off('foo', h1); // remove self during iteration
    };
    const h2 = () => calls.push('h2');

    emitter.on('foo', h1);
    emitter.on('foo', h2);
    emitter.emit('foo', 0);

    // Both should fire even though h1 removed itself
    expect(calls).toEqual(['h1', 'h2']);

    // Second emit: h1 is gone
    calls.length = 0;
    emitter.emit('foo', 0);
    expect(calls).toEqual(['h2']);
  });

  it('copy-on-iterate: handler adding new handler does not fire it in same emit', () => {
    const emitter = createTypedEmitter<TestEventMap>();
    const calls: string[] = [];

    const h2 = () => calls.push('h2');
    const h1 = () => {
      calls.push('h1');
      emitter.on('foo', h2);
    };

    emitter.on('foo', h1);
    emitter.emit('foo', 0);

    // Only h1 should fire (h2 was added mid-iteration)
    expect(calls).toEqual(['h1']);

    // Second emit: both fire
    calls.length = 0;
    emitter.emit('foo', 0);
    expect(calls).toEqual(['h1', 'h2']);
  });
});
