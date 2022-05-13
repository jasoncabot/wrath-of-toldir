import { MainScene } from "../scenes";

export default class DebugText extends Phaser.GameObjects.Text {
  prefix: string = "";

  constructor(scene: MainScene) {
    super(scene, 10, 10, '', { color: '#ffffff', fontSize: '12px', fontFamily: "'Press Start 2P'" });

    scene.add.existing(this);
    this.setOrigin(0);

    scene.cameras.main.ignore(this);
  }

  public update() {
    if (this.active && this.visible) {
      this.setText(`${this.prefix} fps: ${Math.floor(this.scene.game.loop.actualFps)}`)
    }
  }
}
