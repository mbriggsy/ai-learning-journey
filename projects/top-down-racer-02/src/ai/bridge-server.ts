/**
 * WebSocket Bridge Server — RPC interface for Python AI training.
 *
 * Accepts JSON messages over WebSocket: reset, step, close.
 * Each connection gets its own HeadlessEnv instance.
 * Binds to localhost only (no LAN exposure).
 */

import { WebSocketServer, WebSocket } from 'ws';
import { HeadlessEnv } from './headless-env';
import type { AiConfig } from './ai-config';
import { DEFAULT_AI_CONFIG } from './ai-config';

export function startBridgeServer(port = 9876) {
  const wss = new WebSocketServer({
    port,
    host: '127.0.0.1',
    perMessageDeflate: false,
    maxPayload: 65_536,
    skipUTF8Validation: true,
    clientTracking: true,
  });

  wss.on('connection', (ws, req) => {
    req.socket.setNoDelay(true);

    let env: HeadlessEnv | null = null;

    ws.on('message', (data: Buffer) => {
      let response: object;
      try {
        const msg = JSON.parse(data.toString());
        response = dispatch(msg);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[bridge] error:', message);
        response = { type: 'error', message };
      }
      ws.send(JSON.stringify(response));
    });

    function dispatch(msg: Record<string, unknown>): object {
      switch (msg.type) {
        case 'reset': {
          const trackId = (msg.trackId as string) ?? 'track-01';
          const config = (msg.config as AiConfig) ?? DEFAULT_AI_CONFIG;
          env = new HeadlessEnv(trackId, config);
          const result = env.reset();
          return { type: 'reset_result', observation: result.observation, info: result.info };
        }
        case 'step': {
          if (!env) {
            return { type: 'error', message: 'Call reset before step' };
          }
          const result = env.step(msg.action as [number, number, number]);
          return {
            type: 'step_result',
            observation: result.observation,
            reward: result.reward,
            terminated: result.terminated,
            truncated: result.truncated,
            info: result.info,
          };
        }
        case 'close': {
          env = null;
          return { type: 'close_result' };
        }
        default:
          return { type: 'error', message: `Unknown message type: ${msg.type}` };
      }
    }

    ws.on('close', () => { env = null; });
    ws.on('error', (err) => {
      console.error('[bridge] connection error:', err.message);
      env = null;
    });
  });

  function shutdown() {
    console.log('[bridge] shutting down...');
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Server shutting down');
      }
    });
    wss.close(() => {
      console.log('[bridge] closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  wss.on('listening', () => {
    console.log(`[bridge] listening on ws://127.0.0.1:${port}`);
  });

  return { wss, shutdown };
}
