import { EntityId } from "@/game/game";

export type CombatAction = 'attack' | 'defend';

interface BaseStats {
    hp: number
    attack: number
    defence: number
}

interface CombatAttack {
    targets: EntityId[]
}

export interface AttackResult {
    entityId: string
    damage: number
}

export class Combat implements DurableObject {
    stats: BaseStats;

    constructor(private readonly state: DurableObjectState, private readonly env: Bindings) {
        this.state = state;
        this.env = env;

        // TODO: read this from storage
        this.stats = {
            attack: Math.floor(Math.random() * 19) + 1,
            defence: Math.floor(Math.random() * 19) + 1,
            hp: Math.floor(Math.random() * 500)
        } as BaseStats;
    }

    async fetch(request: Request): Promise<Response> {

        const searchParams = new URLSearchParams(new URL(request.url).search);
        const action = searchParams.get('action') as CombatAction;

        switch (action) {
            case "attack": {
                const targets = (await request.json() as CombatAttack).targets;
                const attackResults: AttackResult[] = [];
                for (const entityId of targets) {
                    const id = this.env.COMBAT.idFromName(entityId);
                    const opponent = this.env.COMBAT.get(id);
                    const opponentResponse = await opponent.fetch(`http://combat/?action=defend&id=${entityId}`, {
                        method: 'POST',
                        body: JSON.stringify(this.stats)
                    });
                    const result = await opponentResponse.json() as AttackResult;
                    attackResults.push(result);
                }
                return new Response(JSON.stringify(attackResults), { status: 200 });
            }
            case "defend": {
                const attacker = (await request.json()) as BaseStats;
                const damage = Math.ceil((attacker.attack * attacker.attack) / (attacker.attack + this.stats.defence));
                const result = { entityId: searchParams.get('id'), damage } as AttackResult;

                // TODO: save this to storage
                this.stats.hp = this.stats.hp - damage;

                return new Response(JSON.stringify(result as AttackResult), { status: 200 });
            }
        }
    }
}