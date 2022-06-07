import { CharacterData, Direction } from "grid-engine";
import { textureForEntity, textureMap } from "../../assets/spritesheets/Sprites";
import { EntityInteraction } from "../../models/entities";
import { Elevation, Entity } from "../../models/events";
import { MainScene } from "../scenes";
import FloatingHealthBar from "./floatingHealthBar";
import Weapon from "./weapon";

export const keyForElevation = (elevation: Elevation) => {
  switch (elevation) {
    case Elevation.Unknown: return undefined;
    case Elevation.Level1: return "charLevel1";
  }
}

export const elevationForKey = (key: string | undefined) => {
  if (key === 'charLevel1') return Elevation.Level1;
  return Elevation.Unknown;
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

export default class PlayerCharacter extends Phaser.Physics.Arcade.Sprite {
  identifier: string;
  gridEngineCharacterData: CharacterData;
  canAttack: boolean
  canMagic: boolean;
  weaponSprite: Weapon | undefined;
  nameBadge: Phaser.GameObjects.Text;
  speechBubble: Phaser.GameObjects.Text;
  walkingState: "walk" | "stand" | "attack";
  healthBar: FloatingHealthBar;
  interaction: EntityInteraction;

  constructor(scene: MainScene, name: string, entity: Entity) {
    super(scene, 0, 0, textureForEntity(entity.texture()), 0);
    this.identifier = entity.key().toString();
    this.interaction = entity.interaction();
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
        collisionGroups: ["monster"]
      },
      facingDirection: Direction.DOWN,
      charLayer: keyForElevation(entity.charLayer())
    }
    this.canAttack = true;
    this.canMagic = true;
    this.walkingState = "stand";

    scene.add.existing(this);

    this.healthBar = new FloatingHealthBar(scene, this.getCenter().x, this.getCenter().y, entity.hp()!, entity.maxHp()!);

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
    this.scene.time.delayedCall(1000, () => {
      this.speechBubble.visible = false;
    });
  }

  interact(target: PlayerCharacter, targetAction: EntityInteraction) {
    switch (targetAction) {
      case EntityInteraction.ItemShop:
        console.log("Opening item shop with key " + target.identifier);
        break;
      case EntityInteraction.Quest:
        console.log("Opening quest with key " + target.identifier);
        break;
      case EntityInteraction.WeaponShop:
        console.log("Opening weapon shop with key " + target.identifier);
        break;
    }
  }

  addExpGain(text: string) {
    const floatingExpGain = this.scene.add.text(
      Phaser.Math.Between(this.getCenter().x - 8, this.getCenter().x + 8),
      this.getTopCenter().y,
      text, {
      color: '#91DB69',
      fontSize: '14px',
      fontFamily: "'Press Start 2P'"
    }).setDepth(this.depth + 1)
      .setOrigin(0.5, 1);

    const tweens = this.scene.tweens;

    this.tint = 0x91DB69;
    this.scene.time.delayedCall(250, () => this.clearTint());

    tweens.add({
      targets: floatingExpGain,
      y: floatingExpGain.y - 10,
      ease: "Sine.easeIn",
      duration: 750,
      yoyo: false,
      callbackScope: this,
      onComplete: () => {
        tweens.add({
          targets: floatingExpGain,
          alpha: 0,
          ease: "Sine.easeOut",
          duration: 500,
          yoyo: false,
          callbackScope: this,
          onComplete: () => {
            floatingExpGain.destroy();
          }
        });
      }
    });
    return floatingExpGain;
  }

  addDamage(amount: number, health: number) {
    this.healthBar.setHealth(health);
    this.tint = 0xAE2334;

    const damage = this.scene.add.text(
      Phaser.Math.Between(this.getCenter().x - 8, this.getCenter().x + 8),
      Phaser.Math.Between(this.getCenter().y - 8, this.getCenter().y + 8),
      amount.toString(), {
      color: '#EF3B3C',
      fontSize: '16px',
      fontFamily: "'Press Start 2P'"
    }).setDepth(this.depth + 1)
      .setOrigin(0.5, 1);

    const tweens = this.scene.tweens;

    tweens.add({
      targets: damage,
      y: damage.y - 10,
      ease: "Sine.easeOut",
      duration: 250,
      yoyo: false,
      callbackScope: this,
      onComplete: () => {
        this.clearTint();
        tweens.add({
          targets: damage,
          alpha: 0,
          ease: "Sine.easeOut",
          duration: 500,
          yoyo: false,
          callbackScope: this,
          onComplete: () => {
            damage.destroy();
          }
        });
      }
    });
    return damage;
  }

  explode() {
    const emitter = this.scene.add.particles('blood').createEmitter({
      x: this.getCenter().x,
      y: this.getCenter().y,
      speed: { min: -800, max: 800 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      blendMode: Phaser.BlendModes.COLOR_BURN,
      lifespan: 120,
      gravityY: 800
    });
    emitter.manager.setDepth(this.depth + 1);
    (this.scene as MainScene).interfaceCamera.ignore(emitter.manager);

    this.scene.time.delayedCall(750, () => {
      emitter.remove();
      this.destroy();
    });
  }

  getStopFrame(direction: Direction): number {
    const stopFrames = textureMap.get(this.texture.key)?.stand;
    if (!stopFrames) return 0;
    switch (normalisedFacingDirection(direction)) {
      case Direction.LEFT: return stopFrames.left[stopFrames.left.length - 1];
      case Direction.UP: return stopFrames.up[stopFrames.up.length - 1];
      case Direction.RIGHT: return stopFrames.right[stopFrames.right.length - 1];
      case Direction.DOWN: return stopFrames.down[stopFrames.down.length - 1];
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
    if (direction === Direction.NONE) return;

    if (!this.weaponSprite) {
      this.weaponSprite = new Weapon(this.scene as MainScene, this.getCenter().x, this.getCenter().y, this.identifier);
    }

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

    this.nameBadge.setPosition(this.getCenter().x, this.getBottomCenter().y + 3).setDepth(this.depth + 1);
    if (this.speechBubble.visible) {
      this.speechBubble.setPosition(this.getCenter().x, this.getTopCenter().y).setDepth(this.depth + 2);
    }
    this.healthBar.setPosition(this.getCenter().x, this.getBottomCenter().y + 3).setDepth(this.nameBadge.depth - 1);
  }

  destroy(fromScene?: boolean): void {
    this.healthBar.destroy(fromScene);
    this.weaponSprite?.destroy(fromScene);
    this.nameBadge?.destroy(fromScene);
    this.speechBubble?.destroy(fromScene);
    super.destroy(fromScene);
  }
}

