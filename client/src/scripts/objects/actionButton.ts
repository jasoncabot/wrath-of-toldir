import { MainScene } from "../scenes";

export enum ActionButtonType {
    NormalAttack,
    MagicAttack,
    Potion
}

const textForType = (type: ActionButtonType) => {
    switch (type) {
        case ActionButtonType.NormalAttack: return "1\nATK";
        case ActionButtonType.MagicAttack: return "2\nMAG";
        case ActionButtonType.Potion: return "3\nPOT";
    }
}

export const ActionButtonSelected = 'action-button-selected';

export default class ActionButton extends Phaser.GameObjects.GameObject {
    isSelected: boolean
    actionType: ActionButtonType;
    numberText: Phaser.GameObjects.Text
    background: Phaser.GameObjects.Rectangle;

    constructor(scene: MainScene, x: number, y: number, type: ActionButtonType) {
        super(scene, 'actionButton');

        this.actionType = type;

        this.background = scene.add.rectangle(x, y, 44, 44, 0xff0000).setOrigin(0, 1);

        this.numberText = scene.add.text(x, y, textForType(type), { color: '#ffffff', fontSize: '12px', fontFamily: "'Press Start 2P'" })
            .setOrigin(0, 1);

        scene.cameras.main.ignore([this.background, this.numberText]);

        this.background.setInteractive();
        this.background.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: PointerEvent) => {
            this.emit(ActionButtonSelected, type);
            event.stopPropagation();
        });
        this.background.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: PointerEvent) => {
            event.stopPropagation();
        });
    }

    setSelected(selected: boolean): ActionButton {
        this.isSelected = selected;
        this.background.setFillStyle(selected ? 0x7f708a : 0x3e3546);
        return this;
    }
}
