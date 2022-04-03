import { GridEngine } from 'grid-engine'
import 'phaser'
import MainScene from './scenes/mainScene'
import PreloadScene from './scenes/preloadScene'

const DEFAULT_WIDTH = 576
const DEFAULT_HEIGHT = 576

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#2e222f',
  scale: {
    parent: 'phaser-game',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT
  },
  dom: {
    createContainer: true
  },
  scene: [PreloadScene, MainScene],
  plugins: {
    scene: [
      {
        key: "gridEngine",
        plugin: GridEngine,
        mapping: "gridEngine",
      },
    ],
  },
  render: {
    pixelArt: true
  }
}

window.addEventListener('load', () => {
  const game = new Phaser.Game(config)
})
