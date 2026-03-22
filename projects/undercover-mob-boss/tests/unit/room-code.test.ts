/**
 * Room Code Tests
 *
 * Verifies:
 * 1. Client-side room code generation produces valid 4-letter codes
 * 2. Server uses PartyKit room ID as display code (no mismatch)
 * 3. QR code / lobby shows a code that matches the actual room
 */
import { describe, it, expect } from 'vitest';

// ── Client-side room code generation ────────────────────────────────

import { generateRoomCode } from '../../src/shared/room-code';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no O or I

describe('generateRoomCode (client-side)', () => {
  it('returns a 4-character string', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(4);
  });

  it('uses only allowed characters (no O or I)', () => {
    // Generate many codes to increase confidence
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      for (const ch of code) {
        expect(CODE_CHARS).toContain(ch);
      }
      expect(code).not.toMatch(/[OI]/);
    }
  });

  it('generates different codes (not constant)', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateRoomCode());
    }
    // With 24^4 = 331,776 possibilities, 50 draws should be unique
    expect(codes.size).toBeGreaterThan(1);
  });

  it('returns only uppercase letters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z]{4}$/);
    }
  });
});

// ── Server room code = PartyKit room ID ─────────────────────────────

describe('Server room code matches PartyKit room ID', () => {
  it('room code is derived from room.id, not generated separately', async () => {
    // Import the room class and create a mock PartyKit room
    const { default: UMBRoom } = await import('../../src/server/room');

    const mockRoom = {
      id: 'xkfg',
      getConnections: function* () {},
      storage: { setAlarm: () => {} },
    } as any;

    const room = new UMBRoom(mockRoom);

    // Access the lobby state to verify roomCode matches room.id
    // The getLobbyState method is private, so we trigger it via broadcastState
    // Instead, we can check the HTTP endpoint which also returns roomCode
    const response = await room.onRequest({
      method: 'GET',
      headers: new Headers({ 'Origin': 'http://localhost:5173' }),
    } as any);

    const body = await response.json();
    expect(body.roomCode).toBe('XKFG');
  });

  it('uppercases the room ID for display', async () => {
    const { default: UMBRoom } = await import('../../src/server/room');

    const mockRoom = {
      id: 'abcd',
      getConnections: function* () {},
      storage: { setAlarm: () => {} },
    } as any;

    const room = new UMBRoom(mockRoom);

    const response = await room.onRequest({
      method: 'GET',
      headers: new Headers({ 'Origin': 'http://localhost:5173' }),
    } as any);

    const body = await response.json();
    expect(body.roomCode).toBe('ABCD');
  });

  it('preserves room ID when already uppercase', async () => {
    const { default: UMBRoom } = await import('../../src/server/room');

    const mockRoom = {
      id: 'TEST',
      getConnections: function* () {},
      storage: { setAlarm: () => {} },
    } as any;

    const room = new UMBRoom(mockRoom);

    const response = await room.onRequest({
      method: 'GET',
      headers: new Headers({ 'Origin': 'http://localhost:5173' }),
    } as any);

    const body = await response.json();
    expect(body.roomCode).toBe('TEST');
  });
});
