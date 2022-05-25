import { Entity } from "../../models/events";
import { MainScene } from "../scenes";

export interface LabelledBarDataSource {
    health: { current: number, max: number },
    magic: { current: number, max: number },
    experience: { current: number, max: number, level: number },
}

export enum LabelledBarType {
    Health,
    Magic,
    Experience
}

const textForType = (type: LabelledBarType, data: LabelledBarDataSource) => {
    switch (type) {
        case LabelledBarType.Health: return `${data.health.current}/${data.health.max}`;
        case LabelledBarType.Magic: return `${data.magic.current}/${data.magic.max}`;
        case LabelledBarType.Experience: return `${data.experience.level} (${data.experience.current}/${data.experience.max})`;
    }
}

export default class LabelledBar extends Phaser.GameObjects.Graphics {
    labelledBarType: LabelledBarType;
    label: Phaser.GameObjects.Text
    background: Phaser.GameObjects.Graphics;
    border: Phaser.GameObjects.Graphics;

    setVisible(value: boolean): this {
        super.setVisible(value);
        this.label.setVisible(value);
        this.background.setVisible(value);
        this.border.setVisible(value);
        return this;
    }

    constructor(scene: MainScene, x: number, y: number, type: LabelledBarType, dataSource: LabelledBarDataSource) {
        super(scene, { x, y });

        this.labelledBarType = type;

        this.background = this.scene.add.graphics({ x, y });
        this.background.fillStyle(0x3e3546);
        this.background.fillRect(0, 0, 155, 18);

        scene.add.existing(this);

        this.label = scene.add.text(x + 3, y + 6, textForType(type, dataSource), { color: '#ffffff', fontSize: '8px', fontFamily: "'Press Start 2P'" })
            .setOrigin(0, 0);

        this.border = this.scene.add.graphics({ x, y });
        this.border.lineStyle(1, 0x2e222f);
        this.border.strokeRect(0, 0, 155, 18);
        this.border.lineStyle(1, 0x625565);
        this.border.strokeRect(1, 1, 153, 16);
        this.border.lineStyle(1, 0x3e3546);
        this.border.strokeRect(2, 2, 151, 14);

        scene.cameras.main.ignore([this, this.label, this.border, this.background]);

        switch (this.labelledBarType) {
            case LabelledBarType.Health:
                this.fillGradientStyle(0xEF3B3C, 0xEF3B3C, 0xAF2434, 0xAF2434, 1);
                break;
            case LabelledBarType.Magic:
                this.fillGradientStyle(0X4D9AE4, 0X4D9AE4, 0x4D67B6, 0x4D67B6, 1);
                break;
            case LabelledBarType.Experience:
                this.fillGradientStyle(0X1FBA73, 0X1FBA73, 0X229165, 0X229165, 1);
                break;
        }
        this.fillRect(0, 0, 155, 18);
    }

    onDataSourceUpdated(dataSource: LabelledBarDataSource) {
        this.label.setText(textForType(this.labelledBarType, dataSource));
        switch (this.labelledBarType) {
            case LabelledBarType.Health:
                this.setScale(dataSource.health.current / dataSource.health.max, 1);
                break;
            case LabelledBarType.Magic:
                this.setScale(dataSource.magic.current / dataSource.magic.max, 1);
                break;
            case LabelledBarType.Experience:
                this.setScale(dataSource.experience.current / dataSource.experience.max, 1);
                break;
        }
    }
}
