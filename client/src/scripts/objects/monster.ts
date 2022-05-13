import { CharacterData, Direction } from "grid-engine";
import { textureForEntity } from "../../assets/spritesheets/Sprites";
import { Entity } from "../../models/events";
import { MainScene } from "../scenes";
import { keyForElevation, WalkingAnimatable } from "./playerCharacter";

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
    gridEngineCharacterData: CharacterData;
    walkingState: "walk" | "stand" | "attack";

    constructor(scene: MainScene, name: string, entity: Entity) {
        super(scene, 0, 0, textureForEntity(entity.texture()), 0);
        this.identifier = entity.key().toString();
        this.gridEngineCharacterData = {
            id: this.identifier,
            sprite: this,
            speed: 2,
            startPosition: {
                x: entity.pos()!.x(),
                y: entity.pos()!.y()
            },
            collides: {
                collisionGroups: ["monster"],
            },
            facingDirection: Direction.DOWN,
            charLayer: keyForElevation(entity.charLayer())
        }
        this.walkingState = "stand";

        scene.add.existing(this);
        scene.interfaceCamera.ignore(this);
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
        const anim = this.texture.key + "_walk_" + normalisedFacingDirection(direction);
        return this.play(anim);
    }

    playStandAnimation(direction: Direction) {
        this.walkingState = "stand";
        this.anims.stop();
        this.setFrame(this.getStopFrame(direction));

        const anim = this.texture.key + "_stand_" + normalisedFacingDirection(direction);
        return this.play(anim);
    }

    playAttackAnimation(direction: Direction) {
        if (direction === Direction.NONE) return;
        const oldState = this.walkingState;
        this.walkingState = "attack";
        const anim = this.texture.key + "_attack_" + normalisedFacingDirection(direction);
        return this.play(anim).on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            if (oldState == "walk") {
                this.playWalkAnimation(direction);
            } else {
                this.playStandAnimation(direction);
            }
        });
    }
}
