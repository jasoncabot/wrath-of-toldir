import { CharacterData, Direction, GridEngine } from "grid-engine";

export type SpriteTexture = 'hero1'

const walkMapForTexture = (texture: SpriteTexture) => {
  return {
    up: {
      leftFoot: 58,
      standing: 25,
      rightFoot: 56,
    },
    down: {
      leftFoot: 32,
      standing: 1,
      rightFoot: 34,
    },
    left: {
      leftFoot: 40,
      standing: 10,
      rightFoot: 42,
    },
    right: {
      leftFoot: 48,
      standing: 18,
      rightFoot: 50,
    }
  }
}

export default class PlayerCharacter extends Phaser.Physics.Arcade.Sprite {
  identifier: string;
  gridEngineCharacterData: CharacterData;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: SpriteTexture, identifier: string) {
    super(scene, 0, 0, texture, 0);
    this.identifier = identifier;
    this.gridEngineCharacterData = {
      id: identifier,
      sprite: this,
      speed: 2,
      walkingAnimationMapping: walkMapForTexture(texture),
      startPosition: { x, y },
      collides: {
        collisionGroups: [],
      }
    }

    scene.add.existing(this);
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
