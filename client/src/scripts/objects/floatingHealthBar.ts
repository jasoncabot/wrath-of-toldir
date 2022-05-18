import { Entity } from "../../models/events";
import { MainScene } from "../scenes";

export interface HealthDataSource {
    current: number
    max: number
    emitter: Phaser.Events.EventEmitter
}

export const buildHealthDataSource = (entity: Entity) => {
    // TODO: make this actually emit events when entities health changes
    return {
        current: 100,
        max: 100,
        emitter: new Phaser.Events.EventEmitter()
    } as HealthDataSource;
}

export default class FloatingHealthBar extends Phaser.GameObjects.Graphics {
    background: Phaser.GameObjects.Graphics | undefined;
    bar: Phaser.GameObjects.Graphics | undefined;
    datasource: HealthDataSource;

    constructor(scene: MainScene, x: number, y: number, datasource: HealthDataSource) {
        super(scene, { x, y });

        this.background = this.scene.add.graphics({ x, y });
        this.background.lineStyle(1, 0xFFFFFF);
        this.background.strokeRect(-24, -18, 48, 10);
        this.background.setDepth(this.depth + 1);

        this.bar = this.scene.add.graphics({ x, y });
        this.bar.fillGradientStyle(0xEF3B3C, 0xEF3B3C, 0xAF2434, 0xAF2434, 1);
        this.bar.fillRect(-24, -17, 47, 9);
        this.bar.setDepth(this.depth + 1);

        scene.interfaceCamera.ignore([this, this.background, this.bar]);

        this.datasource = datasource;
        this.onDataSourceUpdated(datasource);
        datasource.emitter.on("did-update", () => {
            this.onDataSourceUpdated(datasource);
        });
    }

    onDataSourceUpdated(dataSource: HealthDataSource) {
        this.bar?.setScale(dataSource.current / dataSource.max, 1);
    }

    setPosition(x?: number, y?: number, z?: number, w?: number): this {
        super.setPosition(x, y, z, w);
        this.background?.setPosition(x, y);
        this.bar?.setPosition(x, y);
        return this;
    }

    destroy(fromScene?: boolean): void {
        this.datasource.emitter.off("did-update");
        this.background?.destroy(fromScene);
        this.bar?.destroy(fromScene);
        super.destroy(fromScene);
    }
}
