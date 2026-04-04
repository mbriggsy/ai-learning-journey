import Phaser from 'phaser';
import type { EscapeWindowPhase } from '../types/state';

export type HUDData = {
  readonly night: number;
  readonly throwables: number;
  readonly escapeWindow: EscapeWindowPhase;
  readonly escapeTimerS: number;
  readonly breathActive: boolean;
  readonly breathRemaining: number;
  readonly breathTotal: number;
};

export function createHUD(scene: Phaser.Scene) {
  const nightText = scene.add.text(16, 16, '', { fontSize: '20px', color: '#e0e0e0' });
  nightText.setScrollFactor(0);
  nightText.setDepth(200);

  const throwableText = scene.add.text(16, scene.cameras.main.height - 40, '', {
    fontSize: '16px', color: '#e0e0e0',
  });
  throwableText.setScrollFactor(0);
  throwableText.setDepth(200);

  const escapeText = scene.add.text(scene.cameras.main.width / 2, 16, '', {
    fontSize: '24px', color: '#ff4444',
  });
  escapeText.setOrigin(0.5, 0);
  escapeText.setScrollFactor(0);
  escapeText.setDepth(200);

  const breathBar = scene.add.graphics();
  breathBar.setScrollFactor(0);
  breathBar.setDepth(200);

  return {
    update(data: HUDData) {
      nightText.setText(`NIGHT ${data.night}`);

      throwableText.setVisible(data.throwables > 0);
      throwableText.setText(`x${data.throwables}`);

      escapeText.setVisible(data.escapeWindow === 'open');
      if (data.escapeWindow === 'open') {
        escapeText.setText(`ESCAPE: ${Math.ceil(data.escapeTimerS)}s`);
      }

      breathBar.clear();
      if (data.breathActive) {
        const barWidth = 200;
        const barHeight = 12;
        const x = (scene.cameras.main.width - barWidth) / 2;
        const y = scene.cameras.main.height / 2 + 40;
        const pct = Math.max(0, data.breathRemaining / data.breathTotal);

        breathBar.fillStyle(0x333333, 0.8);
        breathBar.fillRect(x, y, barWidth, barHeight);
        breathBar.fillStyle(pct > 0.3 ? 0x44aa44 : 0xff4444, 1);
        breathBar.fillRect(x, y, barWidth * pct, barHeight);
      }
    },

    destroy() {
      nightText.destroy();
      throwableText.destroy();
      escapeText.destroy();
      breathBar.destroy();
    },
  };
}
