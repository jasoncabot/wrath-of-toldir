import { Direction } from "grid-engine";
import { MainScene } from "../scenes";
import { normalisedFacingDirection } from "./playerCharacter";

export default class Weapon extends Phaser.Physics.Arcade.Sprite {

    constructor(scene: MainScene, x: number, y: number, key: string) {
        super(scene, x, y, key + '_sword', 0);
        scene.add.existing(this);
        scene.interfaceCamera.ignore(this);
    }

    playAttackAnimation(direction: Direction) {
        this.play("attack_sword_" + normalisedFacingDirection(direction));
    }

    static preload = (scene: Phaser.Scene) => {
        const rate = 16;
        scene.anims.create({
            key: 'attack_sword_' + Direction.DOWN,
            frames: scene.anims.generateFrameNumbers('sword', { frames: [0, 1, 2, 3] }),
            frameRate: rate,
            hideOnComplete: true
        });
        scene.anims.create({
            key: 'attack_sword_' + Direction.UP,
            frames: scene.anims.generateFrameNumbers('sword', { frames: [4, 5, 6, 7] }),
            frameRate: rate,
            hideOnComplete: true
        });
        scene.anims.create({
            key: 'attack_sword_' + Direction.RIGHT,
            frames: scene.anims.generateFrameNumbers('sword', { frames: [8, 9, 10, 11] }),
            frameRate: rate,
            hideOnComplete: true
        });
        scene.anims.create({
            key: 'attack_sword_' + Direction.LEFT,
            frames: scene.anims.generateFrameNumbers('sword', { frames: [12, 13, 14, 15] }),
            frameRate: rate,
            hideOnComplete: true
        });
    }
}
