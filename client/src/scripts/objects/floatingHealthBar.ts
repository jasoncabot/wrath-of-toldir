import { Entity } from "../../models/events";
import { MainScene } from "../scenes";

export interface HealthDataSource {
    current: number
    max: number
    emitter: Phaser.Events.EventEmitter
}

export default class FloatingHealthBar extends Phaser.GameObjects.Graphics {
    background: Phaser.GameObjects.Graphics | undefined;
    bar: Phaser.GameObjects.Image | undefined;
    maxHp: number;

    constructor(scene: MainScene, x: number, y: number, hp: number, maxHp: number) {
        super(scene, { x, y });

        this.background = this.scene.add.graphics({ x, y }).setAlpha(0.8);
        this.background.lineStyle(1, 0xFFFFFF);
        this.background.strokeRect(-24, -18, 48, 10);

        this.bar = this.scene.add.image(x - 23, y - 17, 'floating_hp').setOrigin(0, 0).setAlpha(0.8);

        scene.interfaceCamera.ignore([this, this.background, this.bar]);

        this.maxHp = maxHp;
        this.setHealth(hp);
    }

    setHealth(current: number) {
        this.bar?.setScale(current / this.maxHp, 1);
    }

    setPosition(x?: number, y?: number, z?: number, w?: number): this {
        super.setPosition(x, y, z, w);
        this.background?.setPosition(x, y).setDepth(this.depth + 1);
        this.bar?.setPosition((x ?? 0) - 23, (y ?? 0) - 17).setDepth(this.depth + 1);
        return this;
    }

    destroy(fromScene?: boolean): void {
        this.background?.destroy(fromScene);
        this.bar?.destroy(fromScene);
        super.destroy(fromScene);
    }
}
