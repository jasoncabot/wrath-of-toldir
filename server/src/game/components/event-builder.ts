import { AttackData, MagicAttack, NormalAttack } from "@/models/attacks";
import { AttackCommand } from "@/models/commands";
import { AttackEvent, DamagedEvent, Entity as EntityEvent, JoinEvent, LeaveEvent, MapChangedEvent, MapJoinedEvent, MoveEvent, TileMap, Update, Vec2 } from "@/models/events";
import { MapLayer, TileCollision, TileSet } from "@/models/maps";
import { ChatEvent } from "@/models/wrath-of-toldir/events/chat-event";
import { DamageState } from "@/models/wrath-of-toldir/events/damage-state";
import { EventLog } from "@/models/wrath-of-toldir/events/event-log";
import { Builder } from "flatbuffers";
import { EntityId, Entity, PlayerId, TiledJSON } from "../game";
import { Position, PositionKeeper } from "./position-keeper";

type Effects = { builder: Builder, eventOffsets: number[], eventTypeOffsets: number[] };

export class EventBuilder {
    private tickEvents: Record<PlayerId, Effects>;

    constructor() {
        this.tickEvents = {};
    }

    private tickEventsForPlayer(playerId: PlayerId) {
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

    private popEventsForPlayer(playerId: PlayerId) {
        const events = this.tickEvents[playerId];
        delete this.tickEvents[playerId];
        return events;
    }

    buildEventLog(playerId: string): Uint8Array | undefined {
        const events = this.popEventsForPlayer(playerId);
        if (!events) return undefined;
        const { builder, eventOffsets, eventTypeOffsets } = events;
        const eventVector = EventLog.createEventsVector(builder, eventOffsets);
        const eventTypeVector = EventLog.createEventsTypeVector(builder, eventTypeOffsets);
        EventLog.startEventLog(builder);
        EventLog.addEvents(builder, eventVector);
        EventLog.addEventsType(builder, eventTypeVector);
        const update = EventLog.endEventLog(builder);
        builder.finish(update);

        return builder.asUint8Array();
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

    pushJoinEvent(playerId: PlayerId, name: string, other: Entity) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const otherPlayerName = builder.createString(name);
        const charLayerOffset = builder.createString(other.position.z);

        EntityEvent.startEntity(builder);
        EntityEvent.addCharLayer(builder, charLayerOffset);
        EntityEvent.addKey(builder, other.key);
        EntityEvent.addPos(builder, Vec2.createVec2(builder, other.position.x, other.position.y));
        EntityEvent.addTexture(builder, other.texture);
        const entityOffset = EntityEvent.endEntity(builder);

        JoinEvent.startJoinEvent(builder);
        JoinEvent.addName(builder, otherPlayerName);
        JoinEvent.addEntity(builder, entityOffset);
        eventOffsets.push(JoinEvent.endJoinEvent(builder));
        eventTypeOffsets.push(Update.JoinEvent);
    }

    pushCurrentMapState(playerId: PlayerId, playerName: string, playerData: Entity, mapData: TiledJSON, npcs: Record<EntityId, Entity>, positionKeeper: PositionKeeper) {
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
            const charLayerOffset = builder.createString(pos.z);

            EntityEvent.startEntity(builder);
            EntityEvent.addCharLayer(builder, charLayerOffset);
            EntityEvent.addKey(builder, npc.key);
            EntityEvent.addPos(builder, Vec2.createVec2(builder, pos.x, pos.y));
            EntityEvent.addTexture(builder, npc.texture);
            return EntityEvent.endEntity(builder);
        })
        const npcsVectorOffset = MapJoinedEvent.createNpcsVector(builder, npcOffsets);

        const charLayerOffset = builder.createString(playerData.position.z);
        EntityEvent.startEntity(builder);
        EntityEvent.addCharLayer(builder, charLayerOffset);
        EntityEvent.addKey(builder, playerData.key);
        EntityEvent.addPos(builder, Vec2.createVec2(builder, playerData.position.x, playerData.position.y));
        EntityEvent.addTexture(builder, playerData.texture);
        const playerOffset = EntityEvent.endEntity(builder);

        const nameOffset = builder.createString(playerName);
        MapJoinedEvent.startMapJoinedEvent(builder);
        MapJoinedEvent.addName(builder, nameOffset);
        MapJoinedEvent.addNpcs(builder, npcsVectorOffset);
        MapJoinedEvent.addPlayer(builder, playerOffset);
        MapJoinedEvent.addTilemap(builder, tilemapOffset);

        eventOffsets.push(MapJoinedEvent.endMapJoinedEvent(builder));
        eventTypeOffsets.push(Update.MapJoinedEvent);
    }

    pushMapChangedEvent(playerId: PlayerId, mapId: string, position: Position) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const newMapIdOffset = builder.createString(mapId);
        const charLayerOffset = builder.createString(position.z);
        MapChangedEvent.startMapChangedEvent(builder);
        MapChangedEvent.addId(builder, newMapIdOffset);
        MapChangedEvent.addPos(builder, Vec2.createVec2(builder, position.x, position.y));
        MapChangedEvent.addCharLayer(builder, charLayerOffset);
        const mapChangedEventOffset = MapChangedEvent.endMapChangedEvent(builder);

        eventOffsets.push(mapChangedEventOffset);
        eventTypeOffsets.push(Update.MapChangedEvent);
    }

    pushLeaveEvent(playerId: PlayerId, key: number) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        eventOffsets.push(LeaveEvent.createLeaveEvent(builder, key));
        eventTypeOffsets.push(Update.LeaveEvent);
    }

    pushDamagedEvent(playerId: PlayerId, key: number, damage: number, state: DamageState) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const damagedEventOffset = DamagedEvent.createDamagedEvent(builder, key, damage, state);

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

    pushChatEvent(playerId: PlayerId, key: number, message: string) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);
        const messageOffset = builder.createString(message);
        eventOffsets.push(ChatEvent.createChatEvent(builder, key, messageOffset));
        eventTypeOffsets.push(Update.ChatEvent);
    }

}
