import { Position } from "@/game/components/position-keeper";
import { EntityId } from "@/game/game";
import { DamageState } from "@/models/wrath-of-toldir/events/damage-state";

export type CombatAction = 'attack' | 'defend' | 'spawn';

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
    hp: number
    state: DamageState
}

export interface AttackDamageResult {
    attackerId: EntityId
    targetId: EntityId
    key: number
    damage: number
    remaining: number
    state: DamageState
    position: Position
}

export interface SpawnResult {
    hp: number
}

export class Combat implements DurableObject {
    stats!: BaseStats;

    constructor(private readonly state: DurableObjectState, private readonly env: Bindings) {
        this.state = state;
        this.env = env;

        this.state.blockConcurrencyWhile(async () => {
            let [hp, defence, attack] = await Promise.all([
                this.state.storage.get("hp"),
                this.state.storage.get("defence"),
                this.state.storage.get("attack")]);

            this.stats = { hp, defence, attack } as BaseStats;
        })
    }

    async fetch(request: Request): Promise<Response> {

        const searchParams = new URLSearchParams(new URL(request.url).search);
        const action = searchParams.get('action') as CombatAction;

        switch (action) {
            case "spawn": {
                if (!this.stats.hp || this.stats.hp == 0) {
                    this.onEntitySpawned();
                }
                const result: SpawnResult = { hp: this.stats.hp };
                return new Response(JSON.stringify(result), { status: 201 });
            }
            case "attack": {
                const targets = (await request.json() as CombatAttack).targets;
                const attackResults: AttackResult[] = await Promise.all(targets.map(async (entityId: EntityId) => {
                    const id = this.env.COMBAT.idFromName(entityId);
                    const opponent = this.env.COMBAT.get(id);
                    const opponentResponse = await opponent.fetch(`http://combat/?action=defend&id=${entityId}`, {
                        method: 'POST',
                        body: JSON.stringify(this.stats)
                    });
                    return opponentResponse.json() as Promise<AttackResult>;
                }));
                return new Response(JSON.stringify(attackResults), { status: 200 });
            }
            case "defend": {
                const entityId = searchParams.get('id');
                const attacker = (await request.json()) as BaseStats;
                const damage = Math.ceil((attacker.attack * attacker.attack) / (attacker.attack + this.stats.defence));

                this.stats.hp = Math.max(0, this.stats.hp - damage); // Health can't drop below 0
                const result = { entityId, damage, hp: this.stats.hp, state: DamageState.Default } as AttackResult;

                if (this.stats.hp === 0) {
                    result.state = DamageState.Dead;
                    this.onEntityDestroyed();
                } else {
                    this.state.storage.put("hp", this.stats.hp);
                }

                return new Response(JSON.stringify(result as AttackResult), { status: 200 });
            }
        }
    }

    private onEntitySpawned() {
        // TODO: these shouldn't be this random
        const attack = Math.floor(Math.random() * 19) + 1;
        const defence = Math.floor(Math.random() * 19) + 1;
        const hp = Math.floor(Math.random() * 500);

        this.state.storage.put("attack", attack);
        this.state.storage.put("defence", defence);
        this.state.storage.put("hp", hp);

        this.stats = { hp, defence, attack } as BaseStats;
    }

    private onEntityDestroyed() {
        this.state.storage.delete("attack");
        this.state.storage.delete("defence");
        this.state.storage.delete("hp");
    }
}
