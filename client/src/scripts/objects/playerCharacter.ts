import { CharacterData, Direction, GridEngine } from "grid-engine";

export type SpriteTexture = 'hero1'

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

export default class PlayerCharacter extends Phaser.Physics.Arcade.Sprite {
  identifier: string;
  gridEngineCharacterData: CharacterData;
  canAttack: boolean

  constructor(scene: Phaser.Scene, x: number, y: number, texture: SpriteTexture, identifier: string) {
    super(scene, 0, 0, texture, 0);
    this.identifier = identifier;
    this.gridEngineCharacterData = {
      id: identifier,
      sprite: this,
      speed: 2,
      startPosition: { x, y },
      collides: {
        collisionGroups: [],
      }
    }
    this.canAttack = true;

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

  getWalkAnimation(direction: Direction): string {
    return "hero1_walk_" + normalisedFacingDirection(direction);
  }

  getStandAnimation(direction: Direction): string {
    return "hero1_stand_" + normalisedFacingDirection(direction);
  }

  getAttackAnimation(direction: Direction): string {
    return "hero1_attack_" + normalisedFacingDirection(direction);
  }

  applyMovement(gridEngine: GridEngine, cursors: Phaser.Types.Input.Keyboard.CursorKeys, pointer: Phaser.Input.Pointer): void {
    const movement = cursors.shift.isDown ? gridEngine.turnTowards.bind(gridEngine) : gridEngine.move.bind(gridEngine);

    if (cursors.up.isDown && !cursors.down.isDown) {
      if (cursors.left.isDown && !cursors.right.isDown) {
        movement(this.identifier, Direction.UP_LEFT);
      } else if (!cursors.left.isDown && cursors.right.isDown) {
        movement(this.identifier, Direction.UP_RIGHT);
      } else {
        movement(this.identifier, Direction.UP);
      }
    } else if (!cursors.up.isDown && cursors.down.isDown) {
      if (cursors.left.isDown && !cursors.right.isDown) {
        movement(this.identifier, Direction.DOWN_LEFT);
      } else if (!cursors.left.isDown && cursors.right.isDown) {
        movement(this.identifier, Direction.DOWN_RIGHT);
      } else {
        movement(this.identifier, Direction.DOWN);
      }
    } else {
      if (cursors.left.isDown && !cursors.right.isDown) {
        movement(this.identifier, Direction.LEFT);
      } else if (!cursors.left.isDown && cursors.right.isDown) {
        movement(this.identifier, Direction.RIGHT);
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

      movement(this.identifier, direction);
    }
  }
}

const preloadPlayerCharacter = (scene: Phaser.Scene) => {
  const rate = 16;

  scene.anims.create({
    key: 'hero1_attack_' + Direction.DOWN,
    frames: scene.anims.generateFrameNumbers('hero1', { frames: [65, 67, 68, 70] }),
    frameRate: rate
  });
  scene.anims.create({
    key: 'hero1_attack_' + Direction.UP,
    frames: scene.anims.generateFrameNumbers('hero1', { frames: [88, 90, 93, 95] }),
    frameRate: rate
  });
  scene.anims.create({
    key: 'hero1_attack_' + Direction.RIGHT,
    frames: scene.anims.generateFrameNumbers('hero1', { frames: [96, 98, 108, 110] }),
    frameRate: rate
  });
  scene.anims.create({
    key: 'hero1_attack_' + Direction.LEFT,
    frames: scene.anims.generateFrameNumbers('hero1', { frames: [121, 123, 117, 119] }),
    frameRate: rate
  });

  scene.anims.create({
    key: 'hero1_stand_' + Direction.DOWN,
    frames: scene.anims.generateFrameNumbers("hero1", { frames: [0, 1, 2, 3] }),
    frameRate: 10,
    repeat: -1,
    yoyo: true,
  });
  scene.anims.create({
    key: 'hero1_stand_' + Direction.LEFT,
    frames: scene.anims.generateFrameNumbers("hero1", { frames: [8, 9, 10, 11] }),
    frameRate: 10,
    repeat: -1,
    yoyo: true,
  });
  scene.anims.create({
    key: 'hero1_stand_' + Direction.RIGHT,
    frames: scene.anims.generateFrameNumbers("hero1", { frames: [16, 17, 18, 19] }),
    frameRate: 10,
    repeat: -1,
    yoyo: true,
  });
  scene.anims.create({
    key: 'hero1_stand_' + Direction.UP,
    frames: scene.anims.generateFrameNumbers("hero1", { frames: [24, 25, 26, 27] }),
    frameRate: 10,
    repeat: -1,
    yoyo: true,
  });

  scene.anims.create({
    key: 'hero1_walk_' + Direction.DOWN,
    frames: scene.anims.generateFrameNumbers("hero1", { frames: [32, 33, 34, 35] }),
    frameRate: 10,
    repeat: -1,
    yoyo: true,
  });
  scene.anims.create({
    key: 'hero1_walk_' + Direction.UP,
    frames: scene.anims.generateFrameNumbers("hero1", { frames: [56, 57, 58, 59] }),
    frameRate: 10,
    repeat: -1,
    yoyo: true,
  });
  scene.anims.create({
    key: 'hero1_walk_' + Direction.RIGHT,
    frames: scene.anims.generateFrameNumbers("hero1", { frames: [48, 49, 50, 51] }),
    frameRate: 10,
    repeat: -1,
    yoyo: true,
  });
  scene.anims.create({
    key: 'hero1_walk_' + Direction.LEFT,
    frames: scene.anims.generateFrameNumbers("hero1", { frames: [40, 41, 42, 43] }),
    frameRate: 10,
    repeat: -1,
    yoyo: true,
  });
}

export { preloadPlayerCharacter }