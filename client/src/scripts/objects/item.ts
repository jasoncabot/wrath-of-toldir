import { ItemTexture } from "../../models/items";
import { Item as ItemBuffer } from "../../models/wrath-of-toldir/items/item";
import { stringify as uuidStringify } from 'uuid';

export default class Item {
    private buffer: ItemBuffer;

    id: string;
    texture: ItemTexture;

    constructor(buffer: ItemBuffer) {
        this.buffer = buffer;
        this.id = uuidStringify(buffer.idArray()!);
        this.texture = buffer.template();
    }

    tileTexture() {
        return 4664;
    }
}
