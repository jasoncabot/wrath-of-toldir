import WebFontFile from "../objects/WebFontFile";
import { hero1, hero2, hero3, hero4, hero5, hero6, hero7, hero8, hero9, hero10 } from './../../assets/spritesheets/Sprites/Heroes/';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload() {
    // These must match what the server is sending as the tileset.key
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
    this.load.spritesheet('collisions', 'assets/spritesheets/Tilesets/Collisions.png', { frameWidth: 48, frameHeight: 48 });

    this.load.spritesheet('hero1', hero1, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('hero2', hero2, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('hero3', hero3, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('hero4', hero4, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('hero5', hero5, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('hero6', hero6, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('hero7', hero7, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('hero8', hero8, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('hero9', hero9, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('hero10', hero10, { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('sword', 'assets/spritesheets/Sprites/Weapons/sword-01.png', { frameWidth: 144, frameHeight: 144 });
    this.load.spritesheet('slime1', 'assets/spritesheets/Sprites/Monsters/Slime 01 48.png', { frameWidth: 48, frameHeight: 48 });

    this.load.image('hud', 'assets/img/hud.png');

    this.load.addFile(new WebFontFile(this.load, 'Press Start 2P'));
  }

  create() {
    this.scene.start('MainScene');
  }
}
