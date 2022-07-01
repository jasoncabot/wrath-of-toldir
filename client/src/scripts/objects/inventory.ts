import { Character, Item as ItemBuffer } from "../../models/events";
import { Item } from './index';

export default class Inventory {
    gold: number;
    items: Set<Item>

    constructor(character: Character) {
        this.gold = character.gold()!;
        this.items = new Set();

        for (let i = 0; i < character.itemsLength(); i++) {
            const buffer = character.items(i)!;
            const item = new Item(buffer);
            this.items.add(item);
        }
    }

    gain(item: Item) {
        this.items.add(item);
    }

    text() {
        const description = Array.from(this.items).map((itm,idx) => `${idx+ 1}: ${itm.text()}`).join("\n");
        return `Gold: ${this.gold}\nItems: ${this.items.size}\n${description}`;
    }
}
