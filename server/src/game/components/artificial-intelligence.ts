import { Connection } from "@/durable-objects/map";
import { Entity, EntityId, PlayerId, TiledJSON } from "../game";
import { EventBuilder } from "./event-builder";
import { PositionKeeper } from "./position-keeper";

export class ArtificialIntelligence {
    npcs: Record<EntityId, Entity>;
    connections: Record<PlayerId, Connection>;
    positionKeeper: PositionKeeper;
    eventBuilder: EventBuilder;
    map: TiledJSON;

    constructor(map: TiledJSON, positionKeeper: PositionKeeper, eventBuilder: EventBuilder, connections: Record<PlayerId, Connection>, npcs: Record<EntityId, NPC>) {
        this.map = map;
        this.positionKeeper = positionKeeper;
        this.eventBuilder = eventBuilder;
        this.connections = connections;
        this.npcs = npcs;
    }

    process() {
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
                    pos.x = Math.min(this.map.width, pos.x + 1);
                } else if (x < 0.75) {
                    pos.y = Math.max(0, pos.y - 1);
                } else {
                    pos.y = Math.min(this.map.height, pos.y + 1);
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
