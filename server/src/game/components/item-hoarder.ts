import { Item } from '@/models/events';
import { Component, DamageComponent, ItemTexture } from '@/models/items';
import { DurabilityComponent } from '@/models/wrath-of-toldir/items/durability-component';
import { ItemQuality } from '@/models/wrath-of-toldir/items/item-quality';
import { QualityComponent } from '@/models/wrath-of-toldir/items/quality-component';
import { Builder, ByteBuffer } from 'flatbuffers';
import { parse as uuidParse, stringify as uuidStringify, v4 as uuidv4 } from 'uuid';
import { Position } from "./position-keeper";
import Randomiser from './randomiser';

export interface ItemDrop {
    id: string
    position: Position
    template: ItemTexture
}


export interface ItemPickup {
    item: Item
    position: Position
}

/* TODO: convert these to dynamic drop tables, e.g
    for a given drop type (boss, rare mob, normal mob, chest)
    find the percentages and drop based on that

    boss: [
        {potion: 0.25},
        {sword: 0.75}
    ]
    low level mob: [
        {nothing: 90}
        {potion: 0.05},
        {sword: 0.05}
    ]

*/
const droppableItemTextures = [
    ItemTexture.Potion,
    ItemTexture.Sword
];

const droppableItemQualities = [
    ItemQuality.Normal,
    ItemQuality.Low,
    ItemQuality.High
]

export class ItemHoarder {
    private durableObject: DurableObjectNamespace;
    private randomiser: Randomiser;

    constructor(durableObject: DurableObjectNamespace, randomiser: Randomiser) {
        this.durableObject = durableObject;
        this.randomiser = randomiser;
    }

    create(mapId: string, position: Position) {

        const { item, builder } = this.generateItemDrop();

        const drop: ItemDrop = {
            id: uuidStringify(item.idArray()!),
            position: position,
            template: item.template()
        };

        // Our ITEM works by having a Durable Object for every map that contains all dropped items
        // this is keyed such as `map-fisherswatch` and stores a set of positions to items

        const id = this.durableObject.idFromName(`map-${mapId}`);
        const itemsDroppedOnMap = this.durableObject.get(id);

        const encoded = this.base64encoded(builder);
        const _ = itemsDroppedOnMap.fetch(`http://drops/?action=drop&id=${drop.id}`, {
            method: 'POST',
            body: JSON.stringify({ item: encoded, position })
        });
        return drop;
    }

    async pickup(mapId: string, itemId: string) {
        const id = this.durableObject.idFromName(`map-${mapId}`);
        const itemsDroppedOnMap = this.durableObject.get(id);
        const pickup: ItemPickup | null = await itemsDroppedOnMap.fetch(`http://drops/?action=pickup&id=${itemId}`, { method: 'POST' })
            .then(response => response.json() as any)
            .then(({ item, position }) => {
                if (!item || !position) return null;
                return {
                    item: this.base64decoded(item),
                    position
                } as ItemPickup
            });
        return pickup;
    }

    private generateComponentsForItem(builder: Builder, item: ItemTexture) {
        const componentTypeOffsets: number[] = [];
        const componentOffsets: number[] = [];
        switch (item) {
            case ItemTexture.Sword:
                // damage
                const minimumDamage = this.randomiser.between(2, 5);
                const maximumDamage = this.randomiser.between(6, 12);
                componentTypeOffsets.push(Component.DamageComponent);
                componentOffsets.push(DamageComponent.createDamageComponent(builder, minimumDamage, maximumDamage));
                // quality
                componentTypeOffsets.push(Component.QualityComponent);
                componentOffsets.push(QualityComponent.createQualityComponent(builder, this.randomiser.pick(droppableItemQualities)));
                // durability
                const currentDurability = this.randomiser.between(50, 100);
                const maximumDurability = this.randomiser.between(currentDurability, 100);
                componentTypeOffsets.push(Component.DurabilityComponent);
                componentOffsets.push(DurabilityComponent.createDurabilityComponent(builder, currentDurability, maximumDurability));
                break;
            case ItemTexture.Potion:
                // quality
                componentTypeOffsets.push(Component.QualityComponent);
                componentOffsets.push(QualityComponent.createQualityComponent(builder, this.randomiser.pick(droppableItemQualities)));
                break;
            default: ((_: never) => { throw new Error("Should handle every state") })(item);
        }

        return { componentOffsets, componentTypeOffsets };
    }

    private generateItemDrop() {
        const template = this.randomiser.pick(droppableItemTextures);

        // TODO: this should generate appropriate components randomly for a drop on this map

        // Build our components
        const builder = new Builder(128);

        const { componentOffsets, componentTypeOffsets } = this.generateComponentsForItem(builder, template);

        const componentTypesOffset = Item.createComponentsTypeVector(builder, componentTypeOffsets);
        const componentsOffset = Item.createComponentsVector(builder, componentOffsets);
        const idOffset = Item.createIdVector(builder, Uint8Array.from(uuidParse(uuidv4())));
        const itemOffset = Item.createItem(builder, idOffset, template, componentTypesOffset, componentsOffset);

        builder.finish(itemOffset);

        return { item: Item.getRootAsItem(builder.dataBuffer()), builder };
    }

    private base64encoded(builder: Builder) {
        return btoa(builder.asUint8Array().reduce((prev, curr) => prev += String.fromCharCode(curr), ""));
    }

    private base64decoded(encoded: string) {
        const bytes = new Uint8Array(atob(encoded).split("").map(c => c.charCodeAt(0)));
        return Item.getRootAsItem(new ByteBuffer(bytes));
    }
}

