import type { GameTestBridge } from '../src/renderer/utils/TestBridge.js';

declare global {
  interface Window {
    __GAME_TEST__?: GameTestBridge;
  }
}
