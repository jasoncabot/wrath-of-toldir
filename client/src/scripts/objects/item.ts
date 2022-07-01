import { Component, DamageComponent, DurabilityComponent, ItemQuality, ItemTexture, QualityComponent } from "../../models/items";
import { Item as ItemBuffer } from "../../models/wrath-of-toldir/items/item";
import { stringify as uuidStringify } from 'uuid';

export default class Item {
    // TODO figure out the global ids of items properly
    static mapTileForTemplate(template: ItemTexture): number {
        switch (template) {
            case ItemTexture.Sword: return 4664;
            case ItemTexture.Potion: return 4664;
            default: ((_: never) => { throw new Error("Should handle every state") })(template);
        };
    }

    private buffer: ItemBuffer;

    id: string;
    texture: ItemTexture;

    damage: DamageComponent | undefined;
    durability: DurabilityComponent | undefined;
    quality: QualityComponent | undefined;

    constructor(buffer: ItemBuffer) {
        this.buffer = buffer;
        this.id = uuidStringify(buffer.idArray()!);
        this.texture = buffer.template();

        // There should in theory just be one component of each type
        // but we should probably make sure
        for (let i = 0; i < this.buffer.componentsLength(); i++) {
            const type = this.buffer.componentsType(i)!;
            switch (type) {
                case Component.DamageComponent:
                    this.damage = this.buffer.components(i, new DamageComponent());
                    break;
                case Component.DurabilityComponent:
                    this.durability = this.buffer.components(i, new DurabilityComponent());
                    break;
                case Component.QualityComponent:
                    this.quality = this.buffer.components(i, new QualityComponent());
                    break;
                case Component.NONE:
                    break;
                default: ((_: never) => { throw new Error("Should handle every state") })(type);
            }
        }
    }

    text() {
        const damage = this.damage ? `${this.damage.min()!}-${this.damage.max()!}` : "[ ]";
        const durability = this.durability ? `${this.durability.current()!}/${this.durability.maximum()!}` : "[ ]";
        const quality = this.quality ? `${['Normal', 'Low', "High"][this.quality!.quality()]}` : "[ ]";
        return `\tid: ${this.id}\n\ttexture: ${['Sword', "Potion"][this.texture]}\n\tdamage: ${damage}\n\tdurability: ${durability}\n\tquality: ${quality}`;
    }
}
