export default class DebugText extends Phaser.GameObjects.Text {
  prefix: string = "";

  constructor(scene) {
    super(scene, 10, 10, '', { color: '#ffffff', fontSize: '12px', fontFamily: "'Press Start 2P'" })
    scene.add.existing(this)
    this.setOrigin(0)
  }

  public update() {
    this.setText(`${this.prefix} fps: ${Math.floor(this.scene.game.loop.actualFps)}`)
  }
}