import { ItemDrop } from '@/game/components/item-hoarder';
import { Item as ItemBuffer } from "@/models/wrath-of-toldir/items/item";

export type ItemAction = 'drop' | 'pickup';

export class Item implements DurableObject {

    constructor(private readonly state: DurableObjectState, private readonly env: Bindings) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request): Promise<Response> {

        const searchParams = new URLSearchParams(new URL(request.url).search);
        const action = searchParams.get('action') as ItemAction;
        const itemId = searchParams.get('id')!;

        switch (action) {
            case "drop": {
                // treat the body is an opaque blob of JSON
                // it has a base64-encoded set of bytes that represent the item
                // and a position
                const itemDrop = await request.text()!

                // save to storage
                this.state.storage.put(itemId, itemDrop);

                return new Response(null, { status: 201 });
            }
            case "pickup": {
                const item = await this.state.storage.get(itemId) as string;
                await this.state.storage.delete(itemId);

                return new Response(item, { status: 200 });
            }

            default: ((_: never) => { throw new Error("Should handle every state") })(action);
        }
    }
}
