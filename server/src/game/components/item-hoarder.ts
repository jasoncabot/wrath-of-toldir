import { v4 as uuidv4 } from 'uuid';
import { Position } from "./position-keeper";

export interface ItemDrop {
    id: string
    position: Position
}

export class ItemHoarder {
    private durableObject: DurableObjectNamespace;

    constructor(durableObject: DurableObjectNamespace) {
        this.durableObject = durableObject;
    }

    create(mapId: string, position: Position) {
        const item = {
            id: uuidv4(),
            position: position
        } as ItemDrop;

        // Our ITEM works by having a Durable Object for every map that contains all dropped items
        // this is keyed such as `map-fisherswatch` and stores a set of positions to items

        const id = this.durableObject.idFromName(`map-${mapId}`);
        const itemsDroppedOnMap = this.durableObject.get(id);
        const _ = itemsDroppedOnMap.fetch(`http://drops/?action=drop`, {
            method: 'POST',
            body: JSON.stringify(item)
        });
        return item;
    }

    async pickup(mapId: string, itemId: string) {
        const id = this.durableObject.idFromName(`map-${mapId}`);
        const itemsDroppedOnMap = this.durableObject.get(id);
        const item: ItemDrop = await itemsDroppedOnMap.fetch(`http://drops/?action=pickup&id=${itemId}`, {
            method: 'POST'
        }).then(response => response.json()).then(item => item as ItemDrop);
        return item;
    }
}
