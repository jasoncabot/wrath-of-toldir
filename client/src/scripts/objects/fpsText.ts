export default class FpsText extends Phaser.GameObjects.Text {
  constructor(scene) {
    super(scene, 10, 10, '', { color: '#ffffff', fontSize: '12px', fontFamily: "'Press Start 2P'" })
    scene.add.existing(this)
    this.setOrigin(0)
  }

  public update() {
    this.setText(`fps: ${Math.floor(this.scene.game.loop.actualFps)}`)
  }
}
