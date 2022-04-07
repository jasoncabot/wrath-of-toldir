import { CharacterData, Direction, GridEngine } from "grid-engine";
import Weapon from "./weapon";

export type SpriteTexture = 'hero1'

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
  spriteTexture: SpriteTexture;
  gridEngineCharacterData: CharacterData;
  canAttack: boolean
  weaponSprite: Weapon | undefined;
  walkingState: "walk" | "stand" | "attack";

  constructor(scene: Phaser.Scene, x: number, y: number, z: string, texture: SpriteTexture, identifier: string) {
    super(scene, 0, 0, texture, 0);
    this.identifier = identifier;
    this.spriteTexture = texture;
    this.gridEngineCharacterData = {
      id: identifier,
      sprite: this,
      speed: 2,
      startPosition: { x, y },
      collides: {
        collisionGroups: []
      },
      facingDirection: Direction.DOWN,
      charLayer: z
    }
    this.canAttack = true;
    this.walkingState = "stand";

    scene.add.existing(this);
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

    const anim = this.spriteTexture + "_walk_" + normalisedFacingDirection(direction);
    return this.play(anim);
  }

  playStandAnimation(direction: Direction) {
    this.walkingState = "stand";
    this.anims.stop();
    this.setFrame(this.getStopFrame(direction));

    const anim = this.spriteTexture + "_stand_" + normalisedFacingDirection(direction);
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
    const anim = this.spriteTexture + "_attack_" + normalisedFacingDirection(direction);
    return this.play(anim).on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.weaponSprite?.setVisible(false);
      if (oldState == "walk") {
        this.playWalkAnimation(direction);
      } else {
        this.playStandAnimation(direction);
      }
    });
  }

  static preload = (scene: Phaser.Scene, texture: SpriteTexture) => {
    const frameRate = {
      attack: 16,
      stand: 4,
      walk: 6
    };

    scene.anims.create({
      key: texture + '_attack_' + Direction.DOWN,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [65, 67, 68, 70] }),
      frameRate: frameRate.attack
    });
    scene.anims.create({
      key: texture + '_attack_' + Direction.UP,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [88, 90, 93, 95] }),
      frameRate: frameRate.attack
    });
    scene.anims.create({
      key: texture + '_attack_' + Direction.RIGHT,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [96, 98, 108, 110] }),
      frameRate: frameRate.attack
    });
    scene.anims.create({
      key: texture + '_attack_' + Direction.LEFT,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [121, 123, 117, 119] }),
      frameRate: frameRate.attack
    });

    scene.anims.create({
      key: texture + '_stand_' + Direction.DOWN,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [0, 1, 2, 3] }),
      frameRate: frameRate.stand,
      repeat: -1,
      yoyo: true,
    });
    scene.anims.create({
      key: texture + '_stand_' + Direction.LEFT,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [8, 9, 10, 11] }),
      frameRate: frameRate.stand,
      repeat: -1,
      yoyo: true,
    });
    scene.anims.create({
      key: texture + '_stand_' + Direction.RIGHT,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [16, 17, 18, 19] }),
      frameRate: frameRate.stand,
      repeat: -1,
      yoyo: true,
    });
    scene.anims.create({
      key: texture + '_stand_' + Direction.UP,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [24, 25, 26, 27] }),
      frameRate: frameRate.stand,
      repeat: -1,
      yoyo: true,
    });

    scene.anims.create({
      key: texture + '_walk_' + Direction.DOWN,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [32, 33, 34, 35] }),
      frameRate: frameRate.walk,
      repeat: -1,
      yoyo: true,
    });
    scene.anims.create({
      key: texture + '_walk_' + Direction.UP,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [56, 57, 58, 59] }),
      frameRate: frameRate.walk,
      repeat: -1,
      yoyo: true,
    });
    scene.anims.create({
      key: texture + '_walk_' + Direction.RIGHT,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [48, 49, 50, 51] }),
      frameRate: frameRate.walk,
      repeat: -1,
      yoyo: true,
    });
    scene.anims.create({
      key: texture + '_walk_' + Direction.LEFT,
      frames: scene.anims.generateFrameNumbers(texture, { frames: [40, 41, 42, 43] }),
      frameRate: frameRate.walk,
      repeat: -1,
      yoyo: true,
    });
  }

  applyMovement(gridEngine: GridEngine, cursors: Phaser.Types.Input.Keyboard.CursorKeys, pointer: Phaser.Input.Pointer): void {

    const moveInDirection = (direction: Direction) => {
      if (cursors.shift.isDown) {
        gridEngine.stopMovement(this.identifier);
        gridEngine.turnTowards(this.identifier, direction);        
      } else {
        gridEngine.move(this.identifier, direction);
      }
    }

    if (cursors.up.isDown && !cursors.down.isDown) {
      if (cursors.left.isDown && !cursors.right.isDown) {
        moveInDirection(Direction.UP_LEFT);
      } else if (!cursors.left.isDown && cursors.right.isDown) {
        moveInDirection(Direction.UP_RIGHT);
      } else {
        moveInDirection(Direction.UP);
      }
    } else if (!cursors.up.isDown && cursors.down.isDown) {
      if (cursors.left.isDown && !cursors.right.isDown) {
        moveInDirection(Direction.DOWN_LEFT);
      } else if (!cursors.left.isDown && cursors.right.isDown) {
        moveInDirection(Direction.DOWN_RIGHT);
      } else {
        moveInDirection(Direction.DOWN);
      }
    } else {
      if (cursors.left.isDown && !cursors.right.isDown) {
        moveInDirection(Direction.LEFT);
      } else if (!cursors.left.isDown && cursors.right.isDown) {
        moveInDirection(Direction.RIGHT);
      }
    }

    if (pointer.isDown) {
      pointer.updateWorldPoint(this.scene.cameras.main);

      const angleToPointer = Phaser.Math.Angle.BetweenPoints({ x: pointer.worldX, y: pointer.worldY }, this.getCenter());

      let direction = Direction.RIGHT;
      if (angleToPointer >= -2.74889357189) direction = Direction.DOWN_RIGHT;
      if (angleToPointer >= -1.96349540849) direction = Direction.DOWN;
      if (angleToPointer >= -1.1780972451) direction = Direction.DOWN_LEFT;
      if (angleToPointer >= -0.39269908169) direction = Direction.LEFT;
      if (angleToPointer >= 0.39269908169) direction = Direction.UP_LEFT;
      if (angleToPointer >= 1.1780972451) direction = Direction.UP;
      if (angleToPointer >= 1.96349540849) direction = Direction.UP_RIGHT;

      moveInDirection(direction);
    }

    // update anything attached to our player
    if (this.weaponSprite && this.weaponSprite.visible) {
      this.weaponSprite.setPosition(this.getCenter().x, this.getCenter().y);
    }
  }
}

