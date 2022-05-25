import { SpawnResult } from "@/durable-objects/combat";
import { Connection } from "@/durable-objects/map";
import { v4 as uuidv4 } from 'uuid';
import { Entity, EntityId, Health, PlayerId, TiledJSON } from "../game";
import { EventBuilder } from "./event-builder";
import { PositionKeeper } from "./position-keeper";

export class ArtificialIntelligence {
    npcs: Record<EntityId, Entity>;
    healthRecords: Record<EntityId, Health>;
    connections: Record<PlayerId, Connection>;
    positionKeeper: PositionKeeper;
    eventBuilder: EventBuilder;
    map: TiledJSON;
    combat: DurableObjectNamespace;

    constructor(map: TiledJSON, positionKeeper: PositionKeeper, eventBuilder: EventBuilder, connections: Record<PlayerId, Connection>, npcs: Record<EntityId, Entity>, healthRecords: Record<EntityId, Health>, combat: DurableObjectNamespace) {
        this.map = map;
        this.positionKeeper = positionKeeper;
        this.eventBuilder = eventBuilder;
        this.connections = connections;
        this.npcs = npcs;
        this.healthRecords = healthRecords;
        this.combat = combat;
    }

    async process(tick: number) {

        if (tick % 100 === 0) {
            // Spawn a random other person every couple of ticks! aaaaagggh
            const npcId = uuidv4();
            const npcKey = Math.floor(Math.random() * 2147483647);
            await this.positionKeeper.spawnEntityAtFreePosition(npcId);
            const entity = {
                key: npcKey,
                position: this.positionKeeper.getEntityPosition(npcId),
                texture: Math.floor(Math.random() * 75)
            } as Entity;
            this.npcs[npcId] = entity;

            const npcCombatStatsId = this.combat.idFromName(npcId);
            const npcCombatStats = this.combat.get(npcCombatStatsId);
            const stats: SpawnResult = await npcCombatStats.fetch(`http://combat/?action=spawn`, {
                method: 'POST'
            }).then(spawn => spawn.json() as unknown as SpawnResult);
            const health = {
                current: stats.hp,
                max: stats.hp
            };
            this.healthRecords[npcId] = health;

            const players: PlayerId[] = Object.keys(this.connections);
            this.positionKeeper.findJoinWitnesses(npcId, players, entityId => {
                this.eventBuilder.pushJoinEvent(entityId, "", entity, health);
            });
        }

        // TODO: rather going through all - keep a wake up list
        // where we just pick the ones that are allowed to act on
        // this.tickCount instead of randomly choosing each turn
        Object.keys(this.npcs).forEach(npcId => {
            const { key } = this.npcs[npcId];
            const oldPos = this.positionKeeper.getEntityPosition(npcId);
            // update game state
            const willMove = Math.random() < 0.25;
            if (willMove) {

                let pos = { ...oldPos };
                const x = Math.random();
                if (x < 0.25) {
                    pos.x = Math.max(0, pos.x - 1);
                } else if (x < 0.50) {
                    pos.x = Math.min(this.map.width - 1, pos.x + 1);
                } else if (x < 0.75) {
                    pos.y = Math.max(0, pos.y - 1);
                } else {
                    pos.y = Math.min(this.map.height - 1, pos.y + 1);
                }
                if (!this.positionKeeper.isBlocked(pos)) {
                    this.positionKeeper.setEntityPosition(npcId, pos);
                    // inform other players
                    const players: PlayerId[] = Object.keys(this.connections);
                    this.positionKeeper.findMovementWitnesses(npcId, players, oldPos, pos, otherPlayerId => {
                        this.eventBuilder.pushMovementEvent(otherPlayerId, pos, key);
                    });
                }
            }
        })
    }
}
