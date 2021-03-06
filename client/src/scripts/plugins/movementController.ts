import { Direction, Position } from "grid-engine";
import { PlayerCharacter } from "../objects";
import { MainScene } from "../scenes";

export const DefaultActionTriggered = 'default-action-triggered';

const PI_2 = Math.PI / 2;

const convertToPosition = (x: number, y: number) => {
    return {
        x: Math.floor(x / 48),
        y: Math.floor(y / 48),
    } as Position;
}

export class MovementController extends Phaser.GameObjects.Image {
    shouldMove: boolean;
    direction: Direction;

    private fireDefaultAction: boolean;
    private pointerCount: number;
    private pointer1Down: boolean;

    constructor(scene: MainScene, plugin: PlayerMovementPlugin) {
        super(scene, 0, 0, 'joystick_base');

        this.setPointerCount(0, { x: 0, y: 0 });

        scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
        scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
        plugin.onPluginDestroyed = () => {
            scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
            scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
        };

        scene.add.existing(this);
        scene.cameras.main.ignore(this);
    }

    updateDirection(player: PlayerCharacter, cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
        this.shouldMove = true;

        // try processing keys first, we don't need to be active to do that...
        if (cursors.up.isDown && !cursors.down.isDown) {
            if (cursors.left.isDown && !cursors.right.isDown) {
                this.direction = Direction.UP_LEFT;
            } else if (!cursors.left.isDown && cursors.right.isDown) {
                this.direction = Direction.UP_RIGHT;
            } else {
                this.direction = Direction.UP;
            }
        } else if (!cursors.up.isDown && cursors.down.isDown) {
            if (cursors.left.isDown && !cursors.right.isDown) {
                this.direction = Direction.DOWN_LEFT;
            } else if (!cursors.left.isDown && cursors.right.isDown) {
                this.direction = Direction.DOWN_RIGHT;
            } else {
                this.direction = Direction.DOWN;
            }
        } else if (cursors.left.isDown && !cursors.right.isDown) {
            this.direction = Direction.LEFT;
        } else if (!cursors.left.isDown && cursors.right.isDown) {
            this.direction = Direction.RIGHT;
        } else if (this.active) {
            if (this.scene.input.mousePointer.isDown) {
                this.updatePositionFromMouse(this.scene.input.mousePointer, player, cursors);
            } else {
                this.updatePositionFromJoystick(player);
            }
        } else {
            this.direction = Direction.NONE;
            this.shouldMove = false;
        }

        this.shouldMove = this.shouldMove && !cursors.shift.isDown;
    }

    setActive(value: boolean): this {
        super.setActive(value);

        if (!value) {
            this.pointer1Down = false;
            this.fireDefaultAction = true;
            this.direction = Direction.NONE;
        }
        this.setVisible(value);
        return this;
    }

    onPointerDown(event: PointerEvent) {
        const tilePosition = convertToPosition(this.scene.input.activePointer.worldX, this.scene.input.activePointer.worldY);
        this.setPointerCount(this.pointerCount + 1, tilePosition);
    }

    onPointerUp(event: PointerEvent) {
        const tilePosition = convertToPosition(this.scene.input.activePointer.worldX, this.scene.input.activePointer.worldY);
        // in theory we can have more up than down events when a user presses down on an action button that swallows the event
        // but up on the main scene that allows the event to bubble, so we just cap it at 0
        this.setPointerCount(Math.max(this.pointerCount - 1, 0), tilePosition);
    }

    setPointerCount(count: number, position: Position) {
        this.pointerCount = count;

        if (this.pointerCount > 0) {
            this.setActive(true);
            this.setVisible(false); // so we don't flash up the joystick on taps
        } else {
            if (this.fireDefaultAction) {
                this.emit(DefaultActionTriggered, this.direction, position);
            }

            this.setActive(false);
        }
    }

    updatePositionFromMouse(pointer: Phaser.Input.Pointer, player: PlayerCharacter, cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
        this.setVisible(false); // don't show virtual joystick when using mouse

        this.fireDefaultAction = false;

        if (!this.scene.input.isOver) return;

        pointer.updateWorldPoint(this.scene.cameras.main);

        this.direction = this.directionBetween(player.getCenter(), { x: pointer.worldX, y: pointer.worldY });

        const position = convertToPosition(pointer.worldX, pointer.worldY);
        if (cursors.shift.isDown) {
            this.emit(DefaultActionTriggered, this.direction, position);
        }
    }

    updatePositionFromJoystick(player: PlayerCharacter) {
        // pointer 1 is dpad
        // pointer 2 is button
        // unless pointer1 is just tapped (e.g doesn't move more than the threshold amount)
        if (this.scene.input.pointer1.isDown) {
            if (!this.pointer1Down) {
                this.setPosition(this.scene.input.pointer1.x, this.scene.input.pointer1.y);
                this.pointer1Down = true;
            }

            this.setRotation(Phaser.Math.Angle.BetweenPoints(this.getCenter(), this.scene.input.pointer1) + PI_2);

            const movementThreshold = 4000;
            const actionThreshold = 1200;
            const distanceDragged = Phaser.Math.Distance.BetweenPointsSquared(this.getCenter(), this.scene.input.pointer1);
            if (distanceDragged > movementThreshold) {
                this.setVisible(true);
                this.direction = this.directionBetween(this.getCenter(), this.scene.input.pointer1);
                this.fireDefaultAction = false;
            } else if (distanceDragged > actionThreshold) {
                // the player has dragged a little bit, but not enough to trigger movement
                // this should trigger an action in the direction that we dragged rather than an
                // action from where the player tapped relative to the player
                this.shouldMove = false;
                this.direction = this.directionBetween(this.getCenter(), { x: this.scene.input.pointer1.worldX, y: this.scene.input.pointer1.worldY });
            } else {
                this.shouldMove = false;
                this.direction = this.directionBetween(player.getCenter(), { x: this.scene.input.pointer1.worldX, y: this.scene.input.pointer1.worldY });
            }
        }

        if (this.scene.input.pointer2.isDown) {
            const position = convertToPosition(this.scene.input.pointer2.worldX, this.scene.input.pointer2.worldY);
            this.emit(DefaultActionTriggered, this.direction, position);
        }
    }

    directionBetween(source: Phaser.Types.Math.Vector2Like, destination: Phaser.Types.Math.Vector2Like) {
        const angleToPointer = Phaser.Math.Angle.BetweenPoints(destination, source);
        let direction = Direction.RIGHT;
        if (angleToPointer >= -2.74889357189) direction = Direction.DOWN_RIGHT;
        if (angleToPointer >= -1.96349540849) direction = Direction.DOWN;
        if (angleToPointer >= -1.1780972451) direction = Direction.DOWN_LEFT;
        if (angleToPointer >= -0.39269908169) direction = Direction.LEFT;
        if (angleToPointer >= 0.39269908169) direction = Direction.UP_LEFT;
        if (angleToPointer >= 1.1780972451) direction = Direction.UP;
        if (angleToPointer >= 1.96349540849) direction = Direction.UP_RIGHT;
        if (angleToPointer >= 2.74889357189) direction = Direction.RIGHT;
        return direction;
    }
}

export class PlayerMovementPlugin extends Phaser.Plugins.ScenePlugin {

    onPluginDestroyed: () => void | undefined

    constructor(scene: MainScene, pluginManager: Phaser.Plugins.PluginManager, pluginKey: string) {
        super(scene, pluginManager, pluginKey);

        pluginManager.registerGameObject('joystick', this.joystickFactory, this.joystickCreator);
    }

    joystickFactory() {
        return new MovementController(this.scene as MainScene, this);
    }

    joystickCreator() {
        const joystick = new MovementController(this.scene as MainScene, this);

        Phaser.GameObjects.BuildGameObject(this.scene, joystick, {});

        return joystick;
    }

    destroy(): void {
        if (this.onPluginDestroyed) this.onPluginDestroyed();
        this.pluginManager.removeGameObject('joystick');

        super.destroy();
    }
}
