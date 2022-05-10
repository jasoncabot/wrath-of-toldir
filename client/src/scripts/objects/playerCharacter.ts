import { CharacterData, Direction } from "grid-engine";
import { textureForEntity } from "../../assets/spritesheets/Sprites";
import { Entity } from "../../models/events";
import { MainScene } from "../scenes";
import Weapon from "./weapon";

export interface WalkingAnimatable {
  walkingState: "walk" | "stand" | "attack"
  playWalkAnimation(direction: Direction);
  playStandAnimation(direction: Direction);
  playAttackAnimation(direction: Direction);
}

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

export default class PlayerCharacter extends Phaser.Physics.Arcade.Sprite implements WalkingAnimatable {
  identifier: string;
  gridEngineCharacterData: CharacterData;
  canAttack: boolean
  weaponSprite: Weapon | undefined;
  nameBadge: Phaser.GameObjects.Text;
  speechBubble: Phaser.GameObjects.Text;
  walkingState: "walk" | "stand" | "attack";

  constructor(scene: MainScene, name: string, entity: Entity) {
    super(scene, 0, 0, textureForEntity(entity.texture()), 0);
    this.identifier = entity.key().toString();
    this.name = name;
    this.gridEngineCharacterData = {
      id: this.identifier,
      sprite: this,
      speed: 2,
      startPosition: {
        x: entity.pos()!.x(),
        y: entity.pos()!.y()
      },
      collides: {
        collisionGroups: []
      },
      facingDirection: Direction.DOWN,
      charLayer: entity.charLayer()!
    }
    this.canAttack = true;
    this.walkingState = "stand";

    scene.add.existing(this);

    this.nameBadge = scene.add.text(this.getCenter().x, this.getCenter().y, name, {
      color: '#fff',
      fontSize: '10px',
      fontFamily: "'Verdana'"
    }).setDepth(this.depth + 1).setOrigin(0.5, 0).setShadow(0, 1, '#694f62');

    this.speechBubble = scene.add.text(this.getCenter().x, this.getCenter().y, "", {
      color: '#ffffff',
      fontSize: '12px',
      fontFamily: "'Verdana'"
    }).setDepth(this.depth + 1).setOrigin(0.5, 1).setVisible(false);

    scene.interfaceCamera.ignore([this, this.nameBadge, this.speechBubble]);
  }

  say(message: string) {
    this.speechBubble.text = message;
    // TODO: animation here
    this.speechBubble.visible = true;
    setTimeout(() => {
      this.speechBubble.visible = false;
    }, 1000);
  }

  getStopFrame(direction: Direction): number {
    switch (normalisedFacingDirection(direction)) {
      case Direction.LEFT: return 43;
      case Direction.UP: return 59;
      case Direction.RIGHT: return 51;
      case Direction.DOWN: return 35;
    }
    return 0;
  }

  playWalkAnimation(direction: Direction) {
    this.walkingState = "walk";
    this.anims.stop();
    this.setFrame(this.getStopFrame(direction));

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
    const oldState = this.walkingState;
    this.walkingState = "attack";

    this.anims.stop();
    this.setFrame(this.getStopFrame(direction));

    this.weaponSprite?.setVisible(true)
      .setDepth(this.depth + 1)
      .setPosition(this.getCenter().x, this.getCenter().y)
      .playAttackAnimation(direction);
    const anim = this.texture.key + "_attack_" + normalisedFacingDirection(direction);
    return this.play(anim).on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.weaponSprite?.setVisible(false);
      if (oldState == "walk") {
        this.playWalkAnimation(direction);
      } else {
        this.playStandAnimation(direction);
      }
    });
  }

  updateAttachedSprites() {
    // update anything attached to this player
    if (this.weaponSprite && this.weaponSprite.visible) {
      this.weaponSprite.setPosition(this.getCenter().x, this.getCenter().y);
    }

    this.nameBadge.setPosition(this.getCenter().x, this.getBottomCenter().y).setDepth(this.depth + 1);
    if (this.speechBubble.visible) {
      this.speechBubble.setPosition(this.getCenter().x, this.getTopCenter().y).setDepth(this.depth + 1);
    }
  }

  destroy(fromScene?: boolean): void {
    this.weaponSprite?.destroy(fromScene);
    this.nameBadge?.destroy(fromScene);
    this.speechBubble?.destroy(fromScene);
    super.destroy(fromScene);
  }
}

