import { CharacterData, Direction, GridEngine } from "grid-engine";
import { WalkingAnimatable } from "./playerCharacter";

export type MonsterTexture = 'slime1'

export const normalisedFacingDirection = (direction: Direction) => {
    switch (direction) {
        case Direction.NONE: return Direction.NONE;
        case Direction.LEFT: return Direction.LEFT;
        case Direction.UP_LEFT: return Direction.LEFT;
        case Direction.UP: return Direction.UP;
        case Direction.UP_RIGHT: return Direction.RIGHT;
        case Direction.RIGHT: return Direction.RIGHT;
        case Direction.DOWN_RIGHT: return Direction.RIGHT;
        case Direction.DOWN: return Direction.DOWN;
        case Direction.DOWN_LEFT: return Direction.LEFT;
    }
}

export default class Monster extends Phaser.Physics.Arcade.Sprite implements WalkingAnimatable {
    identifier: string;
    monsterTexture: MonsterTexture;
    gridEngineCharacterData: CharacterData;
    hp: number;
    walkingState: "walk" | "stand" | "attack";

    constructor(scene: Phaser.Scene, x: number, y: number, z: string, texture: MonsterTexture, identifier: string, hp: number) {
        super(scene, 0, 0, texture, 0);
        this.identifier = identifier;
        this.monsterTexture = texture;
        this.gridEngineCharacterData = {
            id: identifier,
            sprite: this,
            speed: 2,
            startPosition: { x, y },
            collides: {
                collisionGroups: [],
            },
            facingDirection: Direction.DOWN,
            charLayer: z
        }
        this.hp = hp;
        this.walkingState = "stand";

        scene.add.existing(this);
    }

    getStopFrame(direction: Direction): number {
        switch (normalisedFacingDirection(direction)) {
            case Direction.LEFT: return 4;
            case Direction.UP: return 12;
            case Direction.RIGHT: return 8;
            case Direction.DOWN: return 0;
        }
        return 0;
    }

    playWalkAnimation(direction: Direction) {
        this.walkingState = "walk";
        const anim = this.monsterTexture + "_walk_" + normalisedFacingDirection(direction);
        return this.play(anim);
    }

    playStandAnimation(direction: Direction) {
        this.walkingState = "stand";
        this.anims.stop();
        this.setFrame(this.getStopFrame(direction));

        const anim = this.monsterTexture + "_stand_" + normalisedFacingDirection(direction);
        return this.play(anim);
    }

    playAttackAnimation(direction: Direction) {
        const oldState = this.walkingState;
        this.walkingState = "attack";
        const anim = this.monsterTexture + "_attack_" + normalisedFacingDirection(direction);
        return this.play(anim).on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            if (oldState == "walk") {
                this.playWalkAnimation(direction);
            } else {
                this.playStandAnimation(direction);
            }
        });
    }

    static preload = (scene: Phaser.Scene, texture: MonsterTexture) => {
        const frameRate = {
            attack: 16,
            stand: 4,
            walk: 6
        };

        // scene.anims.create({
        //     key: texture + '_attack_' + Direction.DOWN,
        //     frames: scene.anims.generateFrameNumbers(texture, { frames: [65, 67, 68, 70] }),
        //     frameRate: rate
        // });
        // scene.anims.create({
        //     key: texture + '_attack_' + Direction.UP,
        //     frames: scene.anims.generateFrameNumbers(texture, { frames: [65, 67, 68, 70] }),
        //     frameRate: rate
        // });
        // scene.anims.create({
        //     key: texture + '_attack_' + Direction.RIGHT,
        //     frames: scene.anims.generateFrameNumbers(texture, { frames: [65, 67, 68, 70] }),
        //     frameRate: rate
        // });
        // scene.anims.create({
        //     key: texture + '_attack_' + Direction.LEFT,
        //     frames: scene.anims.generateFrameNumbers(texture, { frames: [65, 67, 68, 70] }),
        //     frameRate: rate
        // });

        scene.anims.create({
            key: texture + '_stand_' + Direction.DOWN,
            frames: scene.anims.generateFrameNumbers(texture, { frames: [0, 1, 2, 3] }),
            frameRate: frameRate.stand,
            repeat: -1,
            yoyo: true,
        });
        scene.anims.create({
            key: texture + '_stand_' + Direction.UP,
            frames: scene.anims.generateFrameNumbers(texture, { frames: [12, 13, 14, 15] }),
            frameRate: frameRate.stand,
            repeat: -1,
            yoyo: true,
        });
        scene.anims.create({
            key: texture + '_stand_' + Direction.RIGHT,
            frames: scene.anims.generateFrameNumbers(texture, { frames: [8, 9, 10, 11] }),
            frameRate: frameRate.stand,
            repeat: -1,
            yoyo: true,
        });
        scene.anims.create({
            key: texture + '_stand_' + Direction.LEFT,
            frames: scene.anims.generateFrameNumbers(texture, { frames: [4, 5, 6, 7] }),
            frameRate: frameRate.stand,
            repeat: -1,
            yoyo: true,
        });

        scene.anims.create({
            key: texture + '_walk_' + Direction.DOWN,
            frames: scene.anims.generateFrameNumbers(texture, { frames: [16, 17, 18, 19] }),
            frameRate: frameRate.walk,
            repeat: -1,
            yoyo: true,
        });
        scene.anims.create({
            key: texture + '_walk_' + Direction.UP,
            frames: scene.anims.generateFrameNumbers(texture, { frames: [28, 29, 30, 31] }),
            frameRate: frameRate.walk,
            repeat: -1,
            yoyo: true,
        });
        scene.anims.create({
            key: texture + '_walk_' + Direction.RIGHT,
            frames: scene.anims.generateFrameNumbers(texture, { frames: [24, 25, 26, 27] }),
            frameRate: frameRate.walk,
            repeat: -1,
            yoyo: true,
        });
        scene.anims.create({
            key: texture + '_walk_' + Direction.LEFT,
            frames: scene.anims.generateFrameNumbers(texture, { frames: [20, 21, 22, 23] }),
            frameRate: frameRate.walk,
            repeat: -1,
            yoyo: true,
        });
    }
}
