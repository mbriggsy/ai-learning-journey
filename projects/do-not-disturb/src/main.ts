import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: '#1a1a2e',
  scene: {
    create() {
      const text = this.add.text(480, 270, 'Do Not Disturb', {
        fontSize: '32px',
        color: '#e0e0e0',
      });
      text.setOrigin(0.5);
    },
  },
};

new Phaser.Game(config);
