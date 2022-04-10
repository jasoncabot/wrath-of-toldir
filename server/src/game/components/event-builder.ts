import { Connection } from "@/durable-objects/map";
import { AttackData, MagicAttack, NormalAttack } from "@/models/attacks";
import { AttackCommand } from "@/models/commands";
import { AttackEvent, DamagedEvent, JoinEvent, LeaveEvent, MapChangedEvent, MapJoinedEvent, MoveEvent, TileMap, Update, Vec2 } from "@/models/events";
import { MapLayer, TileCollision, TileSet } from "@/models/maps";
import { EventLog } from "@/models/wrath-of-toldir/events/event-log";
import { Npc } from "@/models/wrath-of-toldir/npcs/npc";

import { Builder } from "flatbuffers";
import { EntityId, NPC, Player, PlayerId, TiledJSON } from "../game";
import { Position, PositionKeeper } from "./position-keeper";

type Effects = { builder: Builder, eventOffsets: number[], eventTypeOffsets: number[] };

export class EventBuilder {
    private tickEvents: Record<PlayerId, Effects>;

    constructor() {
        this.tickEvents = {};
    }

    tickEventsForPlayer(playerId: PlayerId) {
        let data = this.tickEvents[playerId];
        if (!data) {
            data = {
                builder: new Builder(1024),
                eventOffsets: [],
                eventTypeOffsets: []
            };
            this.tickEvents[playerId] = data;
        }
        return data;
    }

    popEventsForPlayer(playerId: PlayerId) {
        const events = this.tickEvents[playerId];
        delete this.tickEvents[playerId];
        return events;
    }

    flush(connections: Record<PlayerId, Connection>) {
        for (const [playerId, player] of Object.entries(connections)) {
            try {
                if (player.quitting && player.socket.readyState !== WebSocket.READY_STATE_CLOSED) {
                    player.socket.close(1011, "WebSocket broken.");
                    return;
                }

                this.flushToSocket(playerId, player.socket);
            } catch (err) {
                console.error(err);
            }
        };
    }

    flushToSocket(playerId: string, socket: WebSocket) {
        const events = this.popEventsForPlayer(playerId);
        if (events) {
            const { builder, eventOffsets, eventTypeOffsets } = events;
            const eventVector = EventLog.createEventsVector(builder, eventOffsets);
            const eventTypeVector = EventLog.createEventsTypeVector(builder, eventTypeOffsets);
            EventLog.startEventLog(builder);
            EventLog.addEvents(builder, eventVector);
            EventLog.addEventsType(builder, eventTypeVector);
            const update = EventLog.endEventLog(builder);
            builder.finish(update);

            socket.send(builder.asUint8Array());
        }
    }

    pushMovementEvent(playerId: PlayerId, pos: Position, key: number) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const charLayerOffset = builder.createString(pos.z);

        MoveEvent.startMoveEvent(builder);
        MoveEvent.addKey(builder, key);
        MoveEvent.addPos(builder, Vec2.createVec2(builder, pos.x, pos.y));
        MoveEvent.addCharLayer(builder, charLayerOffset);

        eventOffsets.push(MoveEvent.endMoveEvent(builder));
        eventTypeOffsets.push(Update.MoveEvent);
    }

    pushJoinEvent(playerId: PlayerId, otherPlayer: Player, otherPlayerPos: Position) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const otherPlayerName = builder.createString(otherPlayer.name);
        const charLayerOffset = builder.createString(otherPlayerPos.z);
        JoinEvent.startJoinEvent(builder);
        JoinEvent.addKey(builder, otherPlayer.key);
        JoinEvent.addName(builder, otherPlayerName);
        JoinEvent.addCharLayer(builder, charLayerOffset);
        JoinEvent.addPos(builder, Vec2.createVec2(builder, otherPlayerPos.x, otherPlayerPos.y));

        eventOffsets.push(JoinEvent.endJoinEvent(builder));
        eventTypeOffsets.push(Update.JoinEvent);
    }

    pushCurrentMapState(playerId: PlayerId, mapData: TiledJSON, npcs: Record<EntityId, NPC>, positionKeeper: PositionKeeper) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        // TODO: can we load the (static) map data earlier and just merge the byte buffer here
        // rather than re-creating each time to save on copying bits around - probably!

        const layerOffsets = mapData.layers.map(layer => {
            const mapKeyOffset = builder.createString(layer.key);
            const charLayerOffset = builder.createString(layer.charLayer);
            const dataOffset = MapLayer.createDataVector(builder, layer.data);
            return MapLayer.createMapLayer(builder, mapKeyOffset, dataOffset, charLayerOffset);
        });
        const tilesetOffsets = mapData.tilesets.map(set => {
            const mapKeyOffset = builder.createString(set.key);
            const tileCollisionOffsets = set.collisions.map(c => TileCollision.createTileCollision(builder, c.index, c.directions));
            const collisionsOffset = TileSet.createCollisionsVector(builder, tileCollisionOffsets);
            return TileSet.createTileSet(builder, mapKeyOffset, set.gid, collisionsOffset);
        });
        const layersVector = TileMap.createLayersVector(builder, layerOffsets);
        const tilesetsVector = TileMap.createTilesetsVector(builder, tilesetOffsets);
        const tilemapOffset = TileMap.createTileMap(builder, mapData.width, mapData.height, layersVector, tilesetsVector);

        const npcOffsets = Object.keys(npcs).map(npcId => {
            const npc = npcs[npcId];
            const pos = positionKeeper.getEntityPosition(npcId);
            const textureOffset = builder.createString(npc.type);
            const charLayerOffset = builder.createString(pos.z);
            Npc.startNpc(builder);
            Npc.addKey(builder, npc.key);
            Npc.addTexture(builder, textureOffset);
            Npc.addCharLayer(builder, charLayerOffset);
            Npc.addPos(builder, Vec2.createVec2(builder, pos.x, pos.y))
            return Npc.endNpc(builder);
        })
        const npcsVector = MapJoinedEvent.createNpcsVector(builder, npcOffsets);

        const playerPosition = positionKeeper.getEntityPosition(playerId);
        const charLayerOffset = builder.createString(playerPosition.z);
        MapJoinedEvent.startMapJoinedEvent(builder);
        MapJoinedEvent.addCharLayer(builder, charLayerOffset);
        MapJoinedEvent.addPos(builder, Vec2.createVec2(builder, playerPosition.x, playerPosition.y));
        MapJoinedEvent.addTilemap(builder, tilemapOffset);
        MapJoinedEvent.addNpcs(builder, npcsVector);
        const eventOffset = MapJoinedEvent.endMapJoinedEvent(builder);

        eventOffsets.push(eventOffset);
        eventTypeOffsets.push(Update.MapJoinedEvent);
    }

    pushMapChangedEvent(playerId: PlayerId, mapId: string) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const newMapIdOffset = builder.createString(mapId);
        const mapChangedEventOffset = MapChangedEvent.createMapChangedEvent(builder, newMapIdOffset);

        eventOffsets.push(mapChangedEventOffset);
        eventTypeOffsets.push(Update.MapChangedEvent);
    }

    pushLeaveEvent(playerId: PlayerId, key: number) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        eventOffsets.push(LeaveEvent.createLeaveEvent(builder, key));
        eventTypeOffsets.push(Update.LeaveEvent);
    }

    pushDamagedEvent(playerId: PlayerId, key: number, damage: number) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const damagedEventOffset = DamagedEvent.createDamagedEvent(builder, key, damage);

        eventOffsets.push(damagedEventOffset);
        eventTypeOffsets.push(Update.DamagedEvent);
    }

    pushAttackEvent(playerId: PlayerId, key: number, attack: AttackCommand) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        let dataOffset = 0;
        switch (attack.dataType()) {
            case AttackData.NormalAttack:
                const normal = attack.data(new NormalAttack()) as NormalAttack;
                dataOffset = NormalAttack.createNormalAttack(builder, normal.facing());
                break;
            case AttackData.MagicAttack:
                const magic = attack.data(new MagicAttack()) as MagicAttack;
                const targetPosOffset = Vec2.createVec2(builder, magic.targetPos()!.x(), magic.targetPos()!.y());
                MagicAttack.startMagicAttack(builder);
                MagicAttack.addTargetKey(builder, magic.targetKey());
                MagicAttack.addTargetPos(builder, targetPosOffset);
                dataOffset = MagicAttack.endMagicAttack(builder);
                break;
        }
        AttackEvent.startAttackEvent(builder);
        AttackEvent.addKey(builder, key);
        AttackEvent.addDataType(builder, attack.dataType());
        AttackEvent.addData(builder, dataOffset);
        eventOffsets.push(AttackEvent.endAttackEvent(builder));
        eventTypeOffsets.push(Update.AttackEvent);
    }
}
