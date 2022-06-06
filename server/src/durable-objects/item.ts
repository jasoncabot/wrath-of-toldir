import { ItemDrop } from '@/game/components/item-hoarder';

export type ItemAction = 'drop' | 'pickup';

export class Item implements DurableObject {

    constructor(private readonly state: DurableObjectState, private readonly env: Bindings) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request): Promise<Response> {

        const searchParams = new URLSearchParams(new URL(request.url).search);
        const action = searchParams.get('action') as ItemAction;

        switch (action) {
            case "drop": {
                const item = await request.json() as ItemDrop;

                // save to storage
                this.state.storage.put(item.id, item);

                return new Response(null, { status: 201 });
            }
            case "pickup": {
                const itemId = searchParams.get('id')!;
                const item = await this.state.storage.get(itemId);
                await this.state.storage.delete(itemId);
                return new Response(JSON.stringify(item), { status: 200 });
            }
        }
    }
}
