import { Entity } from "../../models/events";
import { MainScene } from "../scenes";

export interface HealthDataSource {
    current: number
    max: number
    emitter: Phaser.Events.EventEmitter
}

const width = 48;
const height = 10;

export default class FloatingHealthBar extends Phaser.GameObjects.Graphics {
    background: Phaser.GameObjects.Graphics | undefined;
    bar: Phaser.GameObjects.Image | undefined;
    maxHp: number;

    constructor(scene: MainScene, x: number, y: number, hp: number, maxHp: number) {
        super(scene, { x, y });

        this.background = this.scene.add.graphics({ x, y }).setAlpha(0.8);
        this.background.lineStyle(1, 0xFFFFFF);
        this.background.strokeRect(-(width / 2), -(height + 8), width, height);

        this.bar = this.scene.add.image(x - ((width / 2) - 1), y - ((height + 8) - 1), 'floating_hp').setOrigin(0, 0).setAlpha(0.8);

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
        this.bar?.setPosition((x ?? 0) - ((width / 2) - 1), (y ?? 0) - ((height + 8) - 1)).setDepth(this.depth + 1);
        return this;
    }

    setDepth(value: number): this {
        super.setDepth(value);
        this.background?.setDepth(value);
        this.bar?.setDepth(value);
        return this;
    }

    destroy(fromScene?: boolean): void {
        this.background?.destroy(fromScene);
        this.bar?.destroy(fromScene);
        super.destroy(fromScene);
    }
}
