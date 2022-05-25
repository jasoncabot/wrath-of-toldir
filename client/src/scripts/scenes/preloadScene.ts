import WebFontFile from "../objects/WebFontFile";
import { textureMap } from './../../assets/spritesheets/Sprites/';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload() {
    // These must match what the server is sending as the tileset.key
    this.load.spritesheet('bs_decoration', 'assets/spritesheets/Tilesets/Blacksmith Decoration48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('bs_doors_windows', 'assets/spritesheets/Tilesets/Blacksmith Doors Windows48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('bs_floors', 'assets/spritesheets/Tilesets/Blacksmith Floors48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('bs_walls', 'assets/spritesheets/Tilesets/Blacksmith Walls48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('bs_weapons', 'assets/spritesheets/Tilesets/Blacksmith Weapons Decorations48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('collisions', 'assets/spritesheets/Tilesets/Collisions.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('decoration', 'assets/spritesheets/Tilesets/Rural Village Decoration48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('farming', 'assets/spritesheets/Tilesets/Rural Village Farming48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('floors', 'assets/spritesheets/Tilesets/Rural Village Floors48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('marketplace', 'assets/spritesheets/Tilesets/Rural Village Marketplace48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('nature', 'assets/spritesheets/Tilesets/Rural Village Nature48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('roofs', 'assets/spritesheets/Tilesets/Rural Village Roofs48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('terrain', 'assets/spritesheets/Tilesets/Rural Village Terrain48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('walls', 'assets/spritesheets/Tilesets/Rural Village Walls48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('water', 'assets/spritesheets/Tilesets/Rural Village Water48.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('windows', 'assets/spritesheets/Tilesets/Rural Village Doors Windows48.png', { frameWidth: 48, frameHeight: 48 });

    for (let [key, value] of textureMap) {
      this.load.spritesheet(key, value.path, { frameWidth: value.width, frameHeight: value.height });
    }

    this.load.image('hud', 'assets/img/hud.png');
    this.load.image('joystick_base', 'assets/img/joystick/base.png');
    this.load.image('floating_hp', 'assets/img/floating_hp.png');
    this.load.image('blood', 'assets/img/red.png');

    this.load.addFile(new WebFontFile(this.load, 'Press Start 2P'));
  }

  create() {
    this.scene.start('MainScene');
  }
}
