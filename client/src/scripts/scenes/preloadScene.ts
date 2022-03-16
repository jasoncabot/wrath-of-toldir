import WebFontFile from "../objects/WebFontFile";

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload() {
    this.load.spritesheet('rural_village_terrain', 'assets/spritesheets/Tilesets/Rural Village Terrain48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('rural_village_water', 'assets/spritesheets/Animated Tiles/Village Animated Water48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('hero1', 'assets/spritesheets/Sprites/Heroes/Hero 01 48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('sword', 'assets/spritesheets/Sprites/Weapons/sword-01.png', { frameWidth: 144, frameHeight: 144 });

    this.load.image('hud', 'assets/img/hud.png');

    this.load.addFile(new WebFontFile(this.load, 'Press Start 2P'));
  }

  create() {
    this.scene.start('MainScene');
  }
}
