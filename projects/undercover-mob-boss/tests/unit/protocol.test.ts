import { describe, it, expect } from 'vitest';
import { encodeMessage, decodeClientMessage } from '../../src/shared/protocol';
import type { ClientMessage, ServerMessage } from '../../src/shared/protocol';

describe('encodeMessage', () => {
  it('encodes a client message to JSON string', () => {
    const msg: ClientMessage = { type: 'ping', payload: {} };
    const encoded = encodeMessage(msg);
    expect(JSON.parse(encoded)).toEqual(msg);
  });

  it('encodes a server message to JSON string', () => {
    const msg: ServerMessage = { type: 'pong', payload: {} };
    const encoded = encodeMessage(msg);
    expect(JSON.parse(encoded)).toEqual(msg);
  });
});

describe('decodeClientMessage', () => {
  it('decodes a valid join message', () => {
    const raw = JSON.stringify({ type: 'join', payload: { name: 'Alice' } });
    const msg = decodeClientMessage(raw);
    expect(msg).toEqual({ type: 'join', payload: { name: 'Alice' } });
  });

  it('decodes a valid action message', () => {
    const raw = JSON.stringify({
      type: 'action',
      payload: { type: 'vote', playerId: 'p1', vote: 'approve' },
    });
    const msg = decodeClientMessage(raw);
    expect(msg?.type).toBe('action');
  });

  it('returns null for invalid JSON', () => {
    expect(decodeClientMessage('not json')).toBeNull();
  });

  it('returns null for missing type field', () => {
    expect(decodeClientMessage(JSON.stringify({ payload: {} }))).toBeNull();
  });

  it('returns null for non-string type', () => {
    expect(decodeClientMessage(JSON.stringify({ type: 123 }))).toBeNull();
  });
});
