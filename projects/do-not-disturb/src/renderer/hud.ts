import Phaser from 'phaser';
import type { EscapeWindowPhase, ToolType } from '../types/state';

export type HUDData = {
  readonly night: number;
  readonly throwables: number;
  readonly dndSigns: number;
  readonly selectedTool: ToolType | null;
  readonly lighterActive: boolean;
  readonly lighterFuel: number;
  readonly lighterMaxFuel: number;
  readonly escapeWindow: EscapeWindowPhase;
  readonly escapeTimerS: number;
  readonly breathActive: boolean;
  readonly breathRemaining: number;
  readonly breathTotal: number;
};

const TOOL_LABELS: Record<ToolType, string> = {
  throwable: '1:THROW',
  dndSign: '2:DND',
  lighter: '3:LIGHTER',
};

export function createHUD(scene: Phaser.Scene) {
  const cam = scene.cameras.main;

  const nightText = scene.add.text(16, 16, '', { fontSize: '20px', color: '#e0e0e0' });
  nightText.setScrollFactor(0);
  nightText.setDepth(200);

  const throwableText = scene.add.text(16, cam.height - 40, '', {
    fontSize: '16px', color: '#e0e0e0',
  });
  throwableText.setScrollFactor(0);
  throwableText.setDepth(200);

  const dndText = scene.add.text(16, cam.height - 60, '', {
    fontSize: '16px', color: '#e0e0e0',
  });
  dndText.setScrollFactor(0);
  dndText.setDepth(200);

  const toolText = scene.add.text(16, cam.height - 80, '', {
    fontSize: '14px', color: '#ffcc44',
  });
  toolText.setScrollFactor(0);
  toolText.setDepth(200);

  const escapeText = scene.add.text(cam.width / 2, 16, '', {
    fontSize: '24px', color: '#ff4444',
  });
  escapeText.setOrigin(0.5, 0);
  escapeText.setScrollFactor(0);
  escapeText.setDepth(200);

  const breathBar = scene.add.graphics();
  breathBar.setScrollFactor(0);
  breathBar.setDepth(200);

  const lighterBar = scene.add.graphics();
  lighterBar.setScrollFactor(0);
  lighterBar.setDepth(200);

  return {
    update(data: HUDData) {
      nightText.setText(`NIGHT ${data.night}`);

      // Throwable count
      throwableText.setVisible(data.throwables > 0);
      throwableText.setText(`x${data.throwables}`);

      // DND sign count
      dndText.setVisible(data.dndSigns > 0);
      dndText.setText(`DND x${data.dndSigns}`);

      // Selected tool highlight
      if (data.selectedTool) {
        toolText.setVisible(true);
        toolText.setText(`[${TOOL_LABELS[data.selectedTool]}]`);
      } else {
        toolText.setVisible(false);
      }

      // Escape timer
      escapeText.setVisible(data.escapeWindow === 'open');
      if (data.escapeWindow === 'open') {
        escapeText.setText(`ESCAPE: ${Math.ceil(data.escapeTimerS)}s`);
      }

      // Breath bar
      breathBar.clear();
      if (data.breathActive) {
        const barWidth = 200;
        const barHeight = 12;
        const x = (cam.width - barWidth) / 2;
        const y = cam.height / 2 + 40;
        const pct = Math.max(0, data.breathRemaining / data.breathTotal);

        breathBar.fillStyle(0x333333, 0.8);
        breathBar.fillRect(x, y, barWidth, barHeight);
        breathBar.fillStyle(pct > 0.3 ? 0x44aa44 : 0xff4444, 1);
        breathBar.fillRect(x, y, barWidth * pct, barHeight);
      }

      // Lighter fuel bar
      lighterBar.clear();
      if (data.lighterActive && data.lighterMaxFuel > 0) {
        const barWidth = 120;
        const barHeight = 8;
        const x = 16;
        const y = cam.height - 100;
        const pct = Math.max(0, data.lighterFuel / data.lighterMaxFuel);

        lighterBar.fillStyle(0x333333, 0.8);
        lighterBar.fillRect(x, y, barWidth, barHeight);
        lighterBar.fillStyle(0xffaa22, 1);
        lighterBar.fillRect(x, y, barWidth * pct, barHeight);
      }
    },

    destroy() {
      nightText.destroy();
      throwableText.destroy();
      dndText.destroy();
      toolText.destroy();
      escapeText.destroy();
      breathBar.destroy();
      lighterBar.destroy();
    },
  };
}
